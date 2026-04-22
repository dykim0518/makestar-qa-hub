/**
 * coverage_status = none 인 active feature에 manual link 1건을 백필한다.
 *
 * 목적:
 * - "none" 상태를 수동 확인(manual_only)로 정리
 * - detail 화면에서 근거 0건으로 보이지 않도록 명시적 manual link 생성
 *
 * 옵션:
 *   --product=<product> 특정 product만 처리
 *   --dry-run         DB 변경 없이 대상만 출력
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/backfill-coverage-manual.ts
 *   npx tsx --env-file=.env.local scripts/backfill-coverage-manual.ts --product=admin_makestar
 */
import { db } from "../src/db";
import {
  qaCoverageFeatures,
  qaCoverageTestLinks,
  type NewQaCoverageTestLink,
} from "../src/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { recomputeCoverageFeatures } from "../src/lib/coverage-linker";

type Args = {
  dryRun: boolean;
  product: string | null;
};

function parseArgs(argv: string[]): Args {
  const dryRun = argv.includes("--dry-run");
  const productArg = argv.find((arg) => arg.startsWith("--product="));
  const product = productArg?.split("=")[1]?.trim() || null;
  return { dryRun, product };
}

function buildManualTitle(feature: {
  pageTitle: string | null;
  featureName: string;
}): string {
  return `수동 확인: ${feature.pageTitle ?? feature.featureName}`;
}

function buildManualFile(feature: {
  product: string;
  pagePath: string;
}): string {
  const normalizedPath = feature.pagePath
    .replaceAll("/", "_")
    .replaceAll(":", "")
    .replaceAll("?", "")
    .replaceAll("&", "_");
  return `manual://coverage/${feature.product}/${normalizedPath}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const where = args.product
    ? and(
        eq(qaCoverageFeatures.isActive, true),
        eq(qaCoverageFeatures.coverageStatus, "none"),
        eq(qaCoverageFeatures.product, args.product),
      )
    : and(
        eq(qaCoverageFeatures.isActive, true),
        eq(qaCoverageFeatures.coverageStatus, "none"),
      );

  const features = await db
    .select({
      id: qaCoverageFeatures.id,
      product: qaCoverageFeatures.product,
      pagePath: qaCoverageFeatures.pagePath,
      pageTitle: qaCoverageFeatures.pageTitle,
      featureName: qaCoverageFeatures.featureName,
    })
    .from(qaCoverageFeatures)
    .where(where)
    .orderBy(
      qaCoverageFeatures.product,
      qaCoverageFeatures.displayOrder,
      qaCoverageFeatures.pagePath,
    );

  const links: NewQaCoverageTestLink[] = features.map((feature) => ({
    featureId: feature.id,
    testTitle: buildManualTitle(feature),
    testFile: buildManualFile(feature),
    suite: feature.product,
    lastRunId: null,
    lastStatus: null,
    linkSource: "manual",
    lastRunAt: null,
  }));

  console.log(`target features: ${features.length}`);
  console.log(`scope product : ${args.product ?? "all"}`);
  console.log(`dry-run       : ${args.dryRun}`);

  if (args.dryRun) {
    console.log(JSON.stringify(links.slice(0, 20), null, 2));
    process.exit(0);
  }

  let upserted = 0;
  for (let i = 0; i < links.length; i += 100) {
    const batch = links.slice(i, i + 100);
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

  const recomputed = await recomputeCoverageFeatures(
    features.map((feature) => feature.id),
  );

  console.log(`manual links upserted: ${upserted}`);
  console.log(`features recomputed  : ${recomputed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
