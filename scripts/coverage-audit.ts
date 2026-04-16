/**
 * 커버리지 휴리스틱 매칭 audit — 의심스러운 링크 추출.
 *
 * 의심 지표:
 *  - (A) 한 feature에 너무 많은 test가 일괄 링크됨 (broadness)
 *  - (B) 한 test가 여러 feature에 흩뿌려짐 (fan-out)
 *  - (C) 파일명 키워드와 feature pagePath의 실제 단어 매칭이 느슨함
 *
 * 실행:
 *   npx tsx scripts/coverage-audit.ts                # 전체 TOP 10
 *   npx tsx scripts/coverage-audit.ts admin_makestar # 특정 product만
 */
import { db } from "../src/db";
import { qaCoverageFeatures, qaCoverageTestLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

type LinkRow = {
  linkId: string;
  featureId: string;
  featureName: string;
  pagePath: string;
  product: string;
  testTitle: string;
  testFile: string | null;
  lastStatus: string | null;
};

async function main() {
  const productFilter = process.argv[2];
  const rows = await db
    .select({
      linkId: qaCoverageTestLinks.id,
      featureId: qaCoverageFeatures.id,
      featureName: qaCoverageFeatures.featureName,
      pagePath: qaCoverageFeatures.pagePath,
      product: qaCoverageFeatures.product,
      testTitle: qaCoverageTestLinks.testTitle,
      testFile: qaCoverageTestLinks.testFile,
      lastStatus: qaCoverageTestLinks.lastStatus,
    })
    .from(qaCoverageTestLinks)
    .innerJoin(
      qaCoverageFeatures,
      eq(qaCoverageTestLinks.featureId, qaCoverageFeatures.id),
    )
    .where(
      productFilter ? eq(qaCoverageFeatures.product, productFilter) : undefined,
    );

  console.log(
    `📊 total links: ${rows.length}${productFilter ? ` (product=${productFilter})` : ""}\n`,
  );

  // (A) feature별 link 수 TOP
  const byFeature = new Map<string, LinkRow[]>();
  for (const r of rows) {
    if (!byFeature.has(r.featureId)) byFeature.set(r.featureId, []);
    byFeature.get(r.featureId)!.push(r);
  }
  const broadestFeatures = Array.from(byFeature.entries())
    .map(([id, links]) => ({
      featureId: id,
      name: links[0].featureName,
      path: links[0].pagePath,
      product: links[0].product,
      count: links.length,
      files: Array.from(new Set(links.map((l) => l.testFile))).filter(Boolean),
      sampleTitles: links.slice(0, 3).map((l) => l.testTitle),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  console.log("🔴 의심 TOP 10 — 과도하게 많은 테스트가 링크된 feature:");
  console.log("(한 feature에 많은 테스트 = 블랭킷 매칭 가능성 높음)\n");
  for (const f of broadestFeatures) {
    console.log(`  [${f.count}건] ${f.product} · ${f.path} — ${f.name}`);
    console.log(`     files: ${f.files.join(", ")}`);
    console.log(
      `     sample: ${f.sampleTitles.map((t) => t.slice(0, 60)).join(" | ")}`,
    );
    console.log(`     → featureId: ${f.featureId}`);
    console.log();
  }

  // (B) test별 fan-out
  const byTest = new Map<string, LinkRow[]>();
  for (const r of rows) {
    const key = `${r.testFile}::${r.testTitle}`;
    if (!byTest.has(key)) byTest.set(key, []);
    byTest.get(key)!.push(r);
  }
  const fanoutTests = Array.from(byTest.entries())
    .map(([key, links]) => ({ key, count: links.length, links }))
    .filter((t) => t.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  console.log("🟡 한 테스트가 여러 feature에 흩어진 경우 TOP 5:\n");
  for (const t of fanoutTests) {
    const first = t.links[0];
    console.log(
      `  [${t.count}개 feature] ${first.testFile} — ${first.testTitle.slice(0, 60)}`,
    );
    console.log(`     features: ${t.links.map((l) => l.pagePath).join(", ")}`);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
