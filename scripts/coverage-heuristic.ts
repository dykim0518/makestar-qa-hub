/**
 * 휴리스틱 매처 — 기존 Playwright 테스트 spec을 기능 inventory와 자동 매핑.
 *
 * 2-phase:
 *  Phase 1 (기본): proposal JSON만 출력 — DB 미수정
 *    npx tsx scripts/coverage-heuristic.ts
 *  Phase 2 (--apply): 제안된 링크를 DB에 upsert
 *    npx tsx scripts/coverage-heuristic.ts --apply
 *
 * 매칭 규칙:
 *  - 파일명 prefix → product 추정 (admin_poca → admin_pocaalbum 등)
 *  - 파일명의 기능 키워드(order/artist/product/user/...) → feature.pagePath 포함 여부
 *  - test() title 추출하여 title로 저장
 *  - 신뢰도: product 매치(+1) + 키워드 매치(+1) — 2점 매치만 제안
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/db";
import {
  qaCoverageFeatures,
  qaCoverageTestLinks,
  type NewQaCoverageTestLink,
} from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

const TESTS_DIR = path.resolve(
  process.env.HOME!,
  "Projects/my-playwright-tests/tests",
);
const OUTPUT_PATH = path.resolve(
  __dirname,
  "coverage-heuristic-proposals.json",
);

// 파일명 prefix → product
const FILE_TO_PRODUCT: { pattern: RegExp; product: string; suite: string }[] = [
  { pattern: /^admin_poca_/, product: "admin_pocaalbum", suite: "admin" },
  { pattern: /^ab_/, product: "admin_albumbuddy", suite: "albumbuddy" },
  { pattern: /^admin_/, product: "admin_makestar", suite: "admin" },
  { pattern: /^cmr_/, product: "cmr", suite: "cmr" },
];

// 파일명 키워드 → pagePath 포함 검색 키
// 주의: pageTitle/featureName 한글 단어는 교차 오염이 심해 pagePath 접두사만 유지
const FILE_KEYWORD_MAP: Record<string, string[]> = {
  order: ["/order"],
  artist: ["/artist"],
  product: ["/product"],
  user: ["/user", "/customer"],
  auth: ["/login"],
  album: ["/album"],
  content: ["/content", "/notice"],
  shop: ["/shop"],
  dashboard: ["/dashboard"],
  monitoring: ["/dashboard"],
  excel: ["/excel"],
  readonly: [],
};

type TestSpec = { file: string; titles: string[] };

function extractTestTitles(content: string): string[] {
  const titles = new Set<string>();
  // test("title", ...) / test(`title`, ...) / test("title", { tag }, ...)
  const re = /\btest\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    titles.add(m[1]);
  }
  return Array.from(titles);
}

function readSpecs(): TestSpec[] {
  const files = fs.readdirSync(TESTS_DIR).filter((f) => f.endsWith(".spec.ts"));
  const specs: TestSpec[] = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(TESTS_DIR, f), "utf-8");
    const titles = extractTestTitles(content);
    if (titles.length > 0) {
      specs.push({ file: f, titles });
    }
  }
  return specs;
}

function inferProduct(file: string): { product: string; suite: string } | null {
  for (const { pattern, product, suite } of FILE_TO_PRODUCT) {
    if (pattern.test(file)) return { product, suite };
  }
  return null;
}

function inferKeywords(file: string): string[] {
  const keywords: string[] = [];
  for (const [kw, hints] of Object.entries(FILE_KEYWORD_MAP)) {
    if (file.includes(kw)) keywords.push(...hints);
  }
  return keywords;
}

type Proposal = {
  file: string;
  product: string;
  suite: string;
  keywords: string[];
  matches: {
    featureId: string;
    featureName: string;
    pagePath: string;
    matchedKeyword: string;
  }[];
  testTitles: string[];
};

async function buildProposals(): Promise<Proposal[]> {
  const specs = readSpecs();
  const allFeatures = await db
    .select({
      id: qaCoverageFeatures.id,
      product: qaCoverageFeatures.product,
      pagePath: qaCoverageFeatures.pagePath,
      featureName: qaCoverageFeatures.featureName,
      pageTitle: qaCoverageFeatures.pageTitle,
    })
    .from(qaCoverageFeatures)
    .where(eq(qaCoverageFeatures.isActive, true));

  const proposals: Proposal[] = [];
  for (const spec of specs) {
    const productHint = inferProduct(spec.file);
    if (!productHint) continue;
    const keywords = inferKeywords(spec.file);
    if (keywords.length === 0) continue;

    const productFeatures = allFeatures.filter(
      (f) => f.product === productHint.product,
    );
    const matches: Proposal["matches"] = [];
    for (const f of productFeatures) {
      for (const kw of keywords) {
        const haystack = `${f.pagePath} ${f.featureName} ${f.pageTitle ?? ""}`;
        if (haystack.includes(kw)) {
          matches.push({
            featureId: f.id,
            featureName: f.featureName,
            pagePath: f.pagePath,
            matchedKeyword: kw,
          });
          break;
        }
      }
    }
    if (matches.length > 0) {
      proposals.push({
        file: spec.file,
        product: productHint.product,
        suite: productHint.suite,
        keywords,
        matches,
        testTitles: spec.titles,
      });
    }
  }
  return proposals;
}

async function applyProposals(proposals: Proposal[]) {
  const links: NewQaCoverageTestLink[] = [];
  for (const p of proposals) {
    for (const m of p.matches) {
      for (const title of p.testTitles) {
        links.push({
          featureId: m.featureId,
          testTitle: title,
          testFile: p.file,
          suite: p.suite,
          lastStatus: "heuristic",
          lastRunAt: new Date(),
        });
      }
    }
  }

  for (let i = 0; i < links.length; i += 100) {
    await db
      .insert(qaCoverageTestLinks)
      .values(links.slice(i, i + 100))
      .onConflictDoUpdate({
        target: [
          qaCoverageTestLinks.featureId,
          qaCoverageTestLinks.testTitle,
          qaCoverageTestLinks.testFile,
        ],
        set: {
          suite: sql`excluded.suite`,
          lastStatus: sql`excluded.last_status`,
          lastRunAt: sql`excluded.last_run_at`,
        },
      });
  }

  // 매칭된 feature들의 coverage_status를 'covered'로 갱신
  const featureIds = Array.from(
    new Set(proposals.flatMap((p) => p.matches.map((m) => m.featureId))),
  );
  if (featureIds.length > 0) {
    await db
      .update(qaCoverageFeatures)
      .set({ coverageStatus: "covered", updatedAt: new Date() })
      .where(inArray(qaCoverageFeatures.id, featureIds));
  }

  return { links: links.length, features: featureIds.length };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const proposals = await buildProposals();

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(proposals, null, 2), "utf-8");
  const totalLinks = proposals.reduce(
    (sum, p) => sum + p.matches.length * p.testTitles.length,
    0,
  );
  const touchedFeatures = new Set(
    proposals.flatMap((p) => p.matches.map((m) => m.featureId)),
  ).size;

  console.log(`📋 proposals: ${proposals.length} specs`);
  console.log(`   predicted links: ${totalLinks}`);
  console.log(`   predicted covered features: ${touchedFeatures}`);
  console.log(`   → ${OUTPUT_PATH}`);

  if (apply) {
    const result = await applyProposals(proposals);
    console.log(
      `\n✅ applied: ${result.links} links, ${result.features} features → covered`,
    );
  } else {
    console.log(`\n(dry-run) --apply 옵션을 붙이면 DB에 반영`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
