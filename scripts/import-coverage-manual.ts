/**
 * 수동 커버리지 링크 일괄 import.
 *
 * 입력: JSON 배열
 *   [{
 *     product: "cmr",
 *     pagePath: "/payments/toss/fail",
 *     featureName: "Toss 결제 실패",
 *     testTitle: "수동검증: Toss 실패 콜백 리다이렉트 확인",
 *     testFile: "manual://cmr/payments/toss-fail",
 *     suite: "cmr"
 *   }]
 *
 * 동작:
 *   - (product, pagePath, featureName)로 feature lookup
 *   - qa_coverage_test_links에 linkSource="manual" upsert
 *   - touched feature의 coverageStatus 재계산
 *
 * 옵션:
 *   --replace  touched feature의 기존 manual links를 먼저 삭제
 *   --dry-run  DB 변경 없이 매핑 결과만 출력
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/import-coverage-manual.ts <input.json>
 *   npx tsx --env-file=.env.local scripts/import-coverage-manual.ts <input.json> --replace
 */
import * as fs from "fs";
import * as path from "path";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  qaCoverageFeatures,
  qaCoverageTestLinks,
  type NewQaCoverageTestLink,
} from "../src/db/schema";
import { recomputeCoverageFeatures } from "../src/lib/coverage-linker";

type Row = {
  product: string;
  pagePath: string;
  featureName: string;
  testTitle: string;
  testFile: string;
  suite?: string;
};

type ResolvedRow = Row & {
  featureId: string;
};

function featureKey(row: {
  product: string;
  pagePath: string;
  featureName: string;
}): string {
  return `${row.product}::${row.pagePath}::${row.featureName}`;
}

function assertNonEmpty(value: string, label: string, index: number): void {
  if (value.trim().length === 0) {
    throw new Error(`row[${index}] ${label} must not be empty`);
  }
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error(
      "Usage: tsx scripts/import-coverage-manual.ts <input.json> [--replace] [--dry-run]",
    );
    process.exit(1);
  }

  const replace = process.argv.includes("--replace");
  const dryRun = process.argv.includes("--dry-run");
  const abs = path.resolve(inputPath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf-8")) as Row[];

  if (!Array.isArray(raw)) {
    throw new Error("input must be a JSON array");
  }

  raw.forEach((row, index) => {
    assertNonEmpty(row.product ?? "", "product", index);
    assertNonEmpty(row.pagePath ?? "", "pagePath", index);
    assertNonEmpty(row.featureName ?? "", "featureName", index);
    assertNonEmpty(row.testTitle ?? "", "testTitle", index);
    assertNonEmpty(row.testFile ?? "", "testFile", index);
  });

  const products = Array.from(new Set(raw.map((row) => row.product)));
  const features = await db
    .select({
      id: qaCoverageFeatures.id,
      product: qaCoverageFeatures.product,
      pagePath: qaCoverageFeatures.pagePath,
      featureName: qaCoverageFeatures.featureName,
    })
    .from(qaCoverageFeatures)
    .where(inArray(qaCoverageFeatures.product, products));

  const featureMap = new Map(features.map((row) => [featureKey(row), row.id]));
  const resolved: ResolvedRow[] = [];
  const missing: Row[] = [];

  for (const row of raw) {
    const featureId = featureMap.get(featureKey(row));
    if (!featureId) {
      missing.push(row);
      continue;
    }
    resolved.push({ ...row, featureId });
  }

  if (missing.length > 0) {
    console.error("missing coverage features:");
    for (const row of missing) {
      console.error(
        `- ${row.product} ${row.pagePath} ${row.featureName} (${row.testTitle})`,
      );
    }
    process.exit(1);
  }

  const touchedFeatureIds = Array.from(
    new Set(resolved.map((row) => row.featureId)),
  );

  console.log(`manual links input: ${resolved.length}`);
  console.log(`touched features: ${touchedFeatureIds.length}`);
  console.log(`replace mode: ${replace}`);
  console.log(`dry-run: ${dryRun}`);

  if (dryRun) {
    console.log(JSON.stringify(resolved, null, 2));
    process.exit(0);
  }

  if (replace && touchedFeatureIds.length > 0) {
    const deleted = await db
      .delete(qaCoverageTestLinks)
      .where(
        and(
          eq(qaCoverageTestLinks.linkSource, "manual"),
          inArray(qaCoverageTestLinks.featureId, touchedFeatureIds),
        ),
      )
      .returning({ id: qaCoverageTestLinks.id });
    console.log(`deleted manual links: ${deleted.length}`);
  }

  const values: NewQaCoverageTestLink[] = resolved.map((row) => ({
    featureId: row.featureId,
    testTitle: row.testTitle,
    testFile: row.testFile,
    suite: row.suite ?? row.product,
    lastRunId: null,
    lastStatus: null,
    linkSource: "manual",
    lastRunAt: null,
  }));

  let upserted = 0;
  for (let i = 0; i < values.length; i += 100) {
    const batch = values.slice(i, i + 100);
    const result = await db
      .insert(qaCoverageTestLinks)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          qaCoverageTestLinks.featureId,
          qaCoverageTestLinks.testTitle,
          qaCoverageTestLinks.testFile,
        ],
        set: {
          suite: sql`excluded.suite`,
          lastRunId: null,
          lastStatus: null,
          linkSource: sql`excluded.link_source`,
          lastRunAt: null,
        },
      })
      .returning({ id: qaCoverageTestLinks.id });
    upserted += result.length;
  }

  const recomputed = await recomputeCoverageFeatures(touchedFeatureIds);

  console.log(`✅ upserted manual links: ${upserted}`);
  console.log(`✅ recomputed features: ${recomputed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
