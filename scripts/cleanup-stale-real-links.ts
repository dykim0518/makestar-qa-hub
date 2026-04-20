/**
 * 현재 spec/tag 기준으로 stale real coverage link를 정리한다.
 *
 * 원칙:
 *  - 현재 spec에서 같은 test title이 여전히 존재할 때만 stale 여부를 판정한다.
 *  - 현재 title의 허용 feature 집합에 없는 real link만 삭제 후보로 본다.
 *  - title이 현재 spec에서 사라진 경우는 자동 삭제하지 않는다. (보수적 동작)
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/cleanup-stale-real-links.ts cmr_monitoring_pom.spec.ts
 *   npx tsx --env-file=.env.local scripts/cleanup-stale-real-links.ts cmr_monitoring_pom.spec.ts --apply
 */
import * as fs from "fs";
import * as path from "path";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import { qaCoverageFeatures, qaCoverageTestLinks } from "@/db/schema";
import {
  buildCoverageStaticPlan,
  parseCoverageSpec,
  type CoverageStaticFeature,
  type CoverageStaticWarning,
} from "@/lib/coverage-static-map";
import { recomputeCoverageFeatures } from "@/lib/coverage-linker";

const TESTS_DIR = path.resolve(
  process.env.HOME!,
  "Projects/my-playwright-tests/tests",
);

type Args = {
  apply: boolean;
  files: string[];
  force: boolean;
};

type SpecState = {
  allowedFeatureIdsByTitle: Map<string, Set<string>>;
  file: string;
  normalizedTitles: Set<string>;
  warnings: CoverageStaticWarning[];
};

type RealLinkRow = {
  featureId: string;
  featureName: string;
  id: string;
  lastRunAt: Date | null;
  lastStatus: string | null;
  pagePath: string;
  product: string;
  testFile: string | null;
  testTitle: string;
};

type StaleRealLink = RealLinkRow & {
  allowedPagePaths: string[];
  normalizedTitle: string;
};

type DuplicateRealLink = RealLinkRow & {
  keptLastRunAt: Date | null;
  keptStatus: string | null;
  keptTitle: string;
  normalizedTitle: string;
};

function parseArgs(): Args {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");
  const files = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

  if (files.length === 0) {
    console.error(
      "Usage: tsx scripts/cleanup-stale-real-links.ts <spec-file...> [--apply] [--force]",
    );
    process.exit(1);
  }

  return { apply, files, force };
}

function normalizeTestTitle(title: string): string {
  const segment = title.split(" > ").at(-1) ?? title;
  return segment.replace(/\s*@feature:[^\s]+/g, "").replace(/\s+/g, " ").trim();
}

function addAllowedFeature(
  map: Map<string, Set<string>>,
  normalizedTitle: string,
  featureId: string,
): void {
  const current = map.get(normalizedTitle) ?? new Set<string>();
  current.add(featureId);
  map.set(normalizedTitle, current);
}

async function loadSpecStates(files: string[]): Promise<{
  specStates: Map<string, SpecState>;
  warnings: CoverageStaticWarning[];
}> {
  const specs = files.map((file) => {
    const absPath = path.join(TESTS_DIR, file);
    if (!fs.existsSync(absPath)) {
      throw new Error(`spec file not found: ${absPath}`);
    }
    const content = fs.readFileSync(absPath, "utf-8");
    return parseCoverageSpec(file, content);
  });

  const allFeatures = await db
    .select({
      featureName: qaCoverageFeatures.featureName,
      id: qaCoverageFeatures.id,
      pagePath: qaCoverageFeatures.pagePath,
      pageTitle: qaCoverageFeatures.pageTitle,
      product: qaCoverageFeatures.product,
      tag: qaCoverageFeatures.tag,
    })
    .from(qaCoverageFeatures)
    .where(eq(qaCoverageFeatures.isActive, true));

  const { proposals, warnings } = buildCoverageStaticPlan(
    specs,
    allFeatures as CoverageStaticFeature[],
  );
  const proposalByFile = new Map(proposals.map((proposal) => [proposal.file, proposal]));
  const warningByFile = new Map<string, CoverageStaticWarning[]>();

  for (const warning of warnings) {
    const current = warningByFile.get(warning.file) ?? [];
    current.push(warning);
    warningByFile.set(warning.file, current);
  }

  const specStates = new Map<string, SpecState>();
  for (const spec of specs) {
    const allowedFeatureIdsByTitle = new Map<string, Set<string>>();
    const proposal = proposalByFile.get(spec.file);
    if (proposal) {
      for (const match of proposal.tagMatches) {
        for (const testTitle of match.testTitles) {
          addAllowedFeature(
            allowedFeatureIdsByTitle,
            normalizeTestTitle(testTitle),
            match.featureId,
          );
        }
      }
    }

    specStates.set(spec.file, {
      allowedFeatureIdsByTitle,
      file: spec.file,
      normalizedTitles: new Set(spec.titles.map(normalizeTestTitle)),
      warnings: warningByFile.get(spec.file) ?? [],
    });
  }

  return { specStates, warnings };
}

async function loadRealLinks(files: string[]): Promise<RealLinkRow[]> {
  return db
    .select({
      featureId: qaCoverageTestLinks.featureId,
      featureName: qaCoverageFeatures.featureName,
      id: qaCoverageTestLinks.id,
      lastRunAt: qaCoverageTestLinks.lastRunAt,
      lastStatus: qaCoverageTestLinks.lastStatus,
      pagePath: qaCoverageFeatures.pagePath,
      product: qaCoverageFeatures.product,
      testFile: qaCoverageTestLinks.testFile,
      testTitle: qaCoverageTestLinks.testTitle,
    })
    .from(qaCoverageTestLinks)
    .innerJoin(
      qaCoverageFeatures,
      eq(qaCoverageTestLinks.featureId, qaCoverageFeatures.id),
    )
    .where(
      inArray(
        qaCoverageTestLinks.testFile,
        files,
      ),
    );
}

function findStaleRealLinks(
  rows: RealLinkRow[],
  specStates: Map<string, SpecState>,
  featurePathById: Map<string, string>,
): {
  skippedUnknownTitles: number;
  stale: StaleRealLink[];
} {
  let skippedUnknownTitles = 0;
  const stale: StaleRealLink[] = [];

  for (const row of rows) {
    if (row.testFile === null) continue;
    const specState = specStates.get(row.testFile);
    if (!specState) continue;

    const normalizedTitle = normalizeTestTitle(row.testTitle);
    if (!specState.normalizedTitles.has(normalizedTitle)) {
      skippedUnknownTitles += 1;
      continue;
    }

    const allowedFeatureIds = specState.allowedFeatureIdsByTitle.get(normalizedTitle);
    if (allowedFeatureIds?.has(row.featureId)) continue;

    stale.push({
      ...row,
      allowedPagePaths: Array.from(allowedFeatureIds ?? []).map(
        (featureId) => featurePathById.get(featureId) ?? `<missing:${featureId}>`,
      ),
      normalizedTitle,
    });
  }

  return { skippedUnknownTitles, stale };
}

function scoreTitleFreshness(row: RealLinkRow): number {
  const withoutTagScore = row.testTitle.includes("@feature:") ? 0 : 1;
  return withoutTagScore;
}

function compareRealLinksDesc(a: RealLinkRow, b: RealLinkRow): number {
  const aTime = a.lastRunAt?.getTime() ?? 0;
  const bTime = b.lastRunAt?.getTime() ?? 0;
  if (aTime !== bTime) return bTime - aTime;

  const freshnessDiff = scoreTitleFreshness(b) - scoreTitleFreshness(a);
  if (freshnessDiff !== 0) return freshnessDiff;

  return a.testTitle.length - b.testTitle.length;
}

function findDuplicateRealLinks(
  rows: RealLinkRow[],
  specStates: Map<string, SpecState>,
): DuplicateRealLink[] {
  const byNormalizedKey = new Map<string, RealLinkRow[]>();

  for (const row of rows) {
    if (row.testFile === null) continue;
    const specState = specStates.get(row.testFile);
    if (!specState) continue;

    const normalizedTitle = normalizeTestTitle(row.testTitle);
    if (!specState.normalizedTitles.has(normalizedTitle)) continue;

    const key = `${row.featureId}::${row.testFile}::${normalizedTitle}`;
    const current = byNormalizedKey.get(key) ?? [];
    current.push(row);
    byNormalizedKey.set(key, current);
  }

  const duplicates: DuplicateRealLink[] = [];
  for (const group of byNormalizedKey.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(compareRealLinksDesc);
    const keeper = sorted[0];
    const normalizedTitle = normalizeTestTitle(keeper.testTitle);

    for (const candidate of sorted.slice(1)) {
      duplicates.push({
        ...candidate,
        keptLastRunAt: keeper.lastRunAt,
        keptStatus: keeper.lastStatus,
        keptTitle: keeper.testTitle,
        normalizedTitle,
      });
    }
  }

  return duplicates;
}

function logWarnings(warnings: CoverageStaticWarning[]): void {
  if (warnings.length === 0) return;
  console.log(`warnings: ${warnings.length}`);
  for (const warning of warnings) {
    console.log(
      `- [${warning.kind}] ${warning.file}:${warning.line} ${warning.message}`,
    );
  }
}

function logDryRunSummary(
  files: string[],
  rows: RealLinkRow[],
  stale: StaleRealLink[],
  duplicates: DuplicateRealLink[],
  skippedUnknownTitles: number,
): void {
  console.log(`files: ${files.join(", ")}`);
  console.log(`real links scanned: ${rows.length}`);
  console.log(`skipped unknown titles: ${skippedUnknownTitles}`);
  console.log(`stale real links: ${stale.length}`);
  console.log(`duplicate real links: ${duplicates.length}`);

  const byFeature = new Map<string, StaleRealLink[]>();
  for (const link of stale) {
    const key = `${link.product}::${link.pagePath}::${link.featureName}`;
    const current = byFeature.get(key) ?? [];
    current.push(link);
    byFeature.set(key, current);
  }

  if (stale.length > 0) {
    console.log("\nstale summary:");
    for (const [key, links] of Array.from(byFeature.entries()).sort((a, b) => {
      return b[1].length - a[1].length;
    })) {
      const [product, pagePath, featureName] = key.split("::");
      console.log(`- ${product} ${pagePath} ${featureName}: ${links.length}`);
      for (const sample of links.slice(0, 5)) {
        const allowed =
          sample.allowedPagePaths.length > 0
            ? sample.allowedPagePaths.join(", ")
            : "(no current tagged feature)";
        console.log(
          `  • ${sample.lastStatus ?? "null"} :: ${sample.testTitle} -> ${allowed}`,
        );
      }
    }
  }

  if (duplicates.length === 0) return;

  console.log("\nduplicate summary:");
  for (const duplicate of duplicates.slice(0, 20)) {
    console.log(
      `- ${duplicate.product} ${duplicate.pagePath} ${duplicate.featureName} :: ${duplicate.testTitle}`,
    );
    console.log(
      `  keep -> ${duplicate.keptTitle} (${duplicate.keptStatus ?? "null"} @ ${duplicate.keptLastRunAt?.toISOString() ?? "null"})`,
    );
  }
}

async function deleteLinks(ids: string[]): Promise<number> {
  let deleted = 0;
  for (let index = 0; index < ids.length; index += 100) {
    const batch = ids.slice(index, index + 100);
    const result = await db
      .delete(qaCoverageTestLinks)
      .where(inArray(qaCoverageTestLinks.id, batch))
      .returning({ id: qaCoverageTestLinks.id });
    deleted += result.length;
  }
  return deleted;
}

async function main() {
  const { apply, files, force } = parseArgs();
  const { specStates, warnings } = await loadSpecStates(files);

  if (warnings.length > 0 && apply && !force) {
    logWarnings(warnings);
    throw new Error(
      "current spec has static parsing warnings; rerun with --force only after review",
    );
  }

  if (warnings.length > 0) {
    logWarnings(warnings);
  }

  const featureRows = await db
    .select({
      id: qaCoverageFeatures.id,
      pagePath: qaCoverageFeatures.pagePath,
    })
    .from(qaCoverageFeatures);
  const featurePathById = new Map(
    featureRows.map((row) => [row.id, row.pagePath]),
  );

  const rows = await loadRealLinks(Array.from(specStates.keys()));
  const { skippedUnknownTitles, stale } = findStaleRealLinks(
    rows,
    specStates,
    featurePathById,
  );
  const staleIds = new Set(stale.map((row) => row.id));
  const duplicates = findDuplicateRealLinks(rows, specStates).filter(
    (row) => !staleIds.has(row.id),
  );

  logDryRunSummary(
    Array.from(specStates.keys()),
    rows,
    stale,
    duplicates,
    skippedUnknownTitles,
  );

  if (!apply) {
    console.log("\n(dry-run) --apply 를 붙이면 stale real link를 삭제합니다.");
    process.exit(0);
  }

  if (stale.length === 0 && duplicates.length === 0) {
    console.log("\n✅ stale/duplicate real link가 없어 삭제 없이 종료합니다.");
    process.exit(0);
  }

  const removable = [...stale.map((row) => row.id), ...duplicates.map((row) => row.id)];
  const deleted = await deleteLinks(removable);
  const recomputed = await recomputeCoverageFeatures(
    Array.from(
      new Set([
        ...stale.map((row) => row.featureId),
        ...duplicates.map((row) => row.featureId),
      ]),
    ),
  );

  console.log(`\n✅ deleted stale/duplicate real links: ${deleted}`);
  console.log(`✅ recomputed features: ${recomputed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
