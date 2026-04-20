/**
 * 정적 매핑 생성기 — Playwright spec을 기능 inventory와 매핑.
 *
 * 2-phase:
 *  Phase 1 (기본): proposal/warning JSON만 출력 — DB 미수정
 *    npx tsx scripts/coverage-heuristic.ts
 *  Phase 2 (--apply): 정적(tag/heuristic) 링크만 재생성하고 coverage_status 재계산
 *    npx tsx scripts/coverage-heuristic.ts --apply
 *
 * 매칭 규칙 (우선순위 순):
 *  1) 정적 태그 매칭
 *     - describe title / describe option.tag
 *     - test title / test option.tag
 *     - feature.tag 정확 일치 → linkSource="tag"
 *  2) 키워드 매칭 (폴백)
 *     - 파일명의 기능 키워드 → feature.pagePath 포함
 *     - explicit @feature 가 없는 테스트만 대상 → linkSource="heuristic"
 *
 * 주의:
 *  - 이 스크립트는 실행 결과(real)를 생성하지 않는다.
 *  - real/manual 링크는 삭제/덮어쓰기 하지 않는다.
 */
import * as fs from "fs";
import * as path from "path";
import { eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import {
  qaCoverageFeatures,
  qaCoverageTestLinks,
  type NewQaCoverageTestLink,
} from "@/db/schema";
import {
  buildCoverageStaticPlan,
  parseCoverageSpec,
  type CoverageStaticFeature,
  type CoverageStaticProposal,
  type CoverageStaticSpec,
  type CoverageStaticWarning,
} from "@/lib/coverage-static-map";
import { recomputeCoverageFeatures } from "@/lib/coverage-linker";

const TESTS_DIR = path.resolve(
  process.env.HOME!,
  "Projects/my-playwright-tests/tests",
);
const OUTPUT_PATH = path.resolve(
  __dirname,
  "coverage-heuristic-proposals.json",
);
const WARNINGS_OUTPUT_PATH = path.resolve(
  __dirname,
  "coverage-heuristic-warnings.json",
);
const STATIC_LINK_SOURCES = ["heuristic", "tag"] as const;

function readSpecs(): CoverageStaticSpec[] {
  const files = fs
    .readdirSync(TESTS_DIR)
    .filter((file) => file.endsWith(".spec.ts"))
    .sort();

  return files.map((file) => {
    const content = fs.readFileSync(path.join(TESTS_DIR, file), "utf-8");
    return parseCoverageSpec(file, content);
  });
}

async function buildPlan(): Promise<{
  proposals: CoverageStaticProposal[];
  warnings: CoverageStaticWarning[];
}> {
  const specs = readSpecs();
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

  return buildCoverageStaticPlan(specs, allFeatures as CoverageStaticFeature[]);
}

function buildStaticLinks(
  proposals: CoverageStaticProposal[],
): {
  keywordLinks: NewQaCoverageTestLink[];
  tagLinks: NewQaCoverageTestLink[];
} {
  const tagMap = new Map<string, NewQaCoverageTestLink>();
  const keywordMap = new Map<string, NewQaCoverageTestLink>();

  const makeKey = (featureId: string, testTitle: string, testFile: string) =>
    `${featureId}::${testFile}::${testTitle}`;

  for (const proposal of proposals) {
    for (const match of proposal.tagMatches) {
      for (const testTitle of match.testTitles) {
        const key = makeKey(match.featureId, testTitle, proposal.file);
        tagMap.set(key, {
          featureId: match.featureId,
          lastRunAt: null,
          lastStatus: null,
          linkSource: "tag",
          suite: proposal.suite,
          testFile: proposal.file,
          testTitle,
        });
      }
    }

    for (const match of proposal.keywordMatches) {
      for (const testTitle of proposal.keywordTestTitles) {
        const key = makeKey(match.featureId, testTitle, proposal.file);
        if (tagMap.has(key)) continue;
        keywordMap.set(key, {
          featureId: match.featureId,
          lastRunAt: null,
          lastStatus: "heuristic",
          linkSource: "heuristic",
          suite: proposal.suite,
          testFile: proposal.file,
          testTitle,
        });
      }
    }
  }

  return {
    keywordLinks: Array.from(keywordMap.values()),
    tagLinks: Array.from(tagMap.values()),
  };
}

async function applyProposals(
  proposals: CoverageStaticProposal[],
): Promise<{
  deletedStaticLinks: number;
  insertedKeywordLinks: number;
  insertedTagLinks: number;
  updatedFeatures: number;
}> {
  const { keywordLinks, tagLinks } = buildStaticLinks(proposals);

  const deleted = await db
    .delete(qaCoverageTestLinks)
    .where(inArray(qaCoverageTestLinks.linkSource, [...STATIC_LINK_SOURCES]))
    .returning({ featureId: qaCoverageTestLinks.featureId });

  const insertBatch = async (links: NewQaCoverageTestLink[]) => {
    for (let index = 0; index < links.length; index += 100) {
      await db
        .insert(qaCoverageTestLinks)
        .values(links.slice(index, index + 100))
        .onConflictDoNothing();
    }
  };

  await insertBatch(tagLinks);
  await insertBatch(keywordLinks);

  const touchedFeatureIds = new Set<string>([
    ...deleted.map((row) => row.featureId),
    ...tagLinks.map((link) => link.featureId as string),
    ...keywordLinks.map((link) => link.featureId as string),
  ]);

  const updatedFeatures = await recomputeCoverageFeatures(touchedFeatureIds);

  return {
    deletedStaticLinks: deleted.length,
    insertedKeywordLinks: keywordLinks.length,
    insertedTagLinks: tagLinks.length,
    updatedFeatures,
  };
}

function logWarnings(warnings: CoverageStaticWarning[]) {
  if (warnings.length === 0) return;
  console.log(`   warnings: ${warnings.length}`);
  for (const warning of warnings.slice(0, 10)) {
    console.log(
      `   - [${warning.kind}] ${warning.file}:${warning.line} ${warning.message}`,
    );
  }
  if (warnings.length > 10) {
    console.log(`   - ... ${warnings.length - 10}건 추가 경고는 JSON 참조`);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { proposals, warnings } = await buildPlan();
  const { keywordLinks, tagLinks } = buildStaticLinks(proposals);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(proposals, null, 2), "utf-8");
  fs.writeFileSync(
    WARNINGS_OUTPUT_PATH,
    JSON.stringify(warnings, null, 2),
    "utf-8",
  );

  console.log(`📋 proposals: ${proposals.length} specs`);
  console.log(`   tag links: ${tagLinks.length}`);
  console.log(`   keyword links: ${keywordLinks.length}`);
  console.log(`   → ${OUTPUT_PATH}`);
  console.log(`   → ${WARNINGS_OUTPUT_PATH}`);
  logWarnings(warnings);

  if (apply) {
    const result = await applyProposals(proposals);
    console.log(
      `\n✅ applied: deleted static=${result.deletedStaticLinks} · tag=${result.insertedTagLinks} · kw=${result.insertedKeywordLinks} · recomputed features=${result.updatedFeatures}`,
    );
  } else {
    console.log(`\n(dry-run) --apply 옵션을 붙이면 정적 링크만 재생성`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
