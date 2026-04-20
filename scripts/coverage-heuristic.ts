/**
 * 휴리스틱 매처 — 기존 Playwright 테스트 spec을 기능 inventory와 자동 매핑.
 *
 * 2-phase:
 *  Phase 1 (기본): proposal JSON만 출력 — DB 미수정
 *    npx tsx scripts/coverage-heuristic.ts
 *  Phase 2 (--apply): 제안된 링크를 DB에 upsert
 *    npx tsx scripts/coverage-heuristic.ts --apply
 *
 * 매칭 규칙 (우선순위 순):
 *  1) 태그 매칭: describe 타이틀의 `@feature:<tag>` ↔ feature.tag 정확 일치
 *     → linkSource="real", lastStatus=null (수동 매핑에 준하는 신뢰)
 *  2) 키워드 매칭 (폴백): 파일명의 기능 키워드 → feature.pagePath 포함
 *     → linkSource="heuristic", lastStatus="heuristic"
 *  - 파일명 prefix → product 추정 (admin_poca → admin_pocaalbum 등)
 *  - test() title 추출하여 title로 저장
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/db";
import {
  qaCoverageFeatures,
  qaCoverageTestLinks,
  type NewQaCoverageTestLink,
} from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

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

type DescribeBlock = {
  title: string;
  tags: string[];
  startLine: number;
  testTitles: string[];
};
type TestSpec = {
  file: string;
  titles: string[];
  describes: DescribeBlock[];
};

const DESCRIBE_RE =
  /\btest\.describe(?:\.serial|\.parallel)?\s*\(\s*[`'"]([^`'"]+)[`'"]/;
const TEST_RE = /\btest\s*\(\s*[`'"]([^`'"]+)[`'"]/;
const FEATURE_TAG_RE = /@feature:([\w.]+)/g;

function extractDescribeBlocks(content: string): DescribeBlock[] {
  const lines = content.split("\n");
  const describes: DescribeBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const dm = DESCRIBE_RE.exec(lines[i]);
    if (!dm) continue;
    const title = dm[1];
    const tags = Array.from(title.matchAll(FEATURE_TAG_RE)).map((m) => m[1]);
    describes.push({ title, tags, startLine: i, testTitles: [] });
  }
  // 각 test()를 가장 가까운 상위 describe에 배정 (선형 스캔)
  for (let i = 0; i < lines.length; i++) {
    if (DESCRIBE_RE.test(lines[i])) continue;
    const tm = TEST_RE.exec(lines[i]);
    if (!tm) continue;
    let owner: DescribeBlock | null = null;
    for (const d of describes) {
      if (d.startLine <= i) owner = d;
      else break;
    }
    if (owner) owner.testTitles.push(tm[1]);
  }
  return describes;
}

function extractTestTitles(content: string): string[] {
  const titles = new Set<string>();
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
    const describes = extractDescribeBlocks(content);
    if (titles.length > 0) {
      specs.push({ file: f, titles, describes });
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
  // describe 단위 태그 매칭 결과
  tagMatches: {
    tag: string;
    describeTitle: string;
    featureId: string;
    featureName: string;
    pagePath: string;
    testTitles: string[];
  }[];
  // 파일 단위 키워드 매칭 결과 (폴백)
  keywordMatches: {
    featureId: string;
    featureName: string;
    pagePath: string;
    matchedKeyword: string;
  }[];
  // 키워드 매칭이 덮는 테스트 타이틀 (태그 매칭에 포함된 타이틀은 제외)
  keywordTestTitles: string[];
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
      tag: qaCoverageFeatures.tag,
    })
    .from(qaCoverageFeatures)
    .where(eq(qaCoverageFeatures.isActive, true));

  const proposals: Proposal[] = [];
  for (const spec of specs) {
    const productHint = inferProduct(spec.file);
    if (!productHint) continue;

    const productFeatures = allFeatures.filter(
      (f) => f.product === productHint.product,
    );

    // 1) 태그 매칭: describe.tags ↔ feature.tag 정확 일치
    const tagMatches: Proposal["tagMatches"] = [];
    const tagCoveredTitles = new Set<string>();
    for (const d of spec.describes) {
      if (d.tags.length === 0 || d.testTitles.length === 0) continue;
      for (const tag of d.tags) {
        const hits = productFeatures.filter((f) => f.tag === tag);
        for (const f of hits) {
          tagMatches.push({
            tag,
            describeTitle: d.title,
            featureId: f.id,
            featureName: f.featureName,
            pagePath: f.pagePath,
            testTitles: [...d.testTitles],
          });
          for (const t of d.testTitles) tagCoveredTitles.add(t);
        }
      }
    }

    // 2) 키워드 매칭 (폴백): 태그로 안 잡힌 테스트만 대상
    const keywords = inferKeywords(spec.file);
    const keywordMatches: Proposal["keywordMatches"] = [];
    const keywordTestTitles = spec.titles.filter(
      (t) => !tagCoveredTitles.has(t),
    );
    if (keywords.length > 0 && keywordTestTitles.length > 0) {
      for (const f of productFeatures) {
        for (const kw of keywords) {
          const haystack = `${f.pagePath} ${f.featureName} ${f.pageTitle ?? ""}`;
          if (haystack.includes(kw)) {
            keywordMatches.push({
              featureId: f.id,
              featureName: f.featureName,
              pagePath: f.pagePath,
              matchedKeyword: kw,
            });
            break;
          }
        }
      }
    }

    if (tagMatches.length > 0 || keywordMatches.length > 0) {
      proposals.push({
        file: spec.file,
        product: productHint.product,
        suite: productHint.suite,
        keywords,
        tagMatches,
        keywordMatches,
        keywordTestTitles,
      });
    }
  }
  return proposals;
}

async function applyProposals(proposals: Proposal[]) {
  const now = new Date();
  const tagLinks: NewQaCoverageTestLink[] = [];
  const kwLinks: NewQaCoverageTestLink[] = [];
  const tagFeatureIds = new Set<string>();
  const kwFeatureIds = new Set<string>();

  for (const p of proposals) {
    for (const m of p.tagMatches) {
      tagFeatureIds.add(m.featureId);
      for (const title of m.testTitles) {
        tagLinks.push({
          featureId: m.featureId,
          testTitle: title,
          testFile: p.file,
          suite: p.suite,
          lastStatus: null,
          linkSource: "real",
          lastRunAt: null,
        });
      }
    }
    for (const m of p.keywordMatches) {
      kwFeatureIds.add(m.featureId);
      for (const title of p.keywordTestTitles) {
        kwLinks.push({
          featureId: m.featureId,
          testTitle: title,
          testFile: p.file,
          suite: p.suite,
          lastStatus: "heuristic",
          linkSource: "heuristic",
          lastRunAt: now,
        });
      }
    }
  }

  // 태그 매칭 먼저 insert (real) → 키워드 매칭은 conflict 시 덮어쓰지 않음
  const batchInsert = async (
    links: NewQaCoverageTestLink[],
    overrideOnConflict: boolean,
  ) => {
    for (let i = 0; i < links.length; i += 100) {
      const chunk = links.slice(i, i + 100);
      const q = db.insert(qaCoverageTestLinks).values(chunk);
      if (overrideOnConflict) {
        await q.onConflictDoUpdate({
          target: [
            qaCoverageTestLinks.featureId,
            qaCoverageTestLinks.testTitle,
            qaCoverageTestLinks.testFile,
          ],
          set: {
            suite: sql`excluded.suite`,
            lastStatus: sql`excluded.last_status`,
            linkSource: sql`excluded.link_source`,
            lastRunAt: sql`excluded.last_run_at`,
          },
        });
      } else {
        await q.onConflictDoNothing();
      }
    }
  };
  await batchInsert(tagLinks, true);
  await batchInsert(kwLinks, false);

  // coverage_status 승격 (downgrade 방지 가드)
  //  - 태그 매칭: 'none' | 'heuristic_only' 인 feature만 'covered'로 승격
  //    (partial / manual_only / covered 는 수동 설정된 상태이므로 보존)
  //  - 키워드 매칭 전용: 'none' 인 feature만 'heuristic_only'로 승격
  if (tagFeatureIds.size > 0) {
    await db
      .update(qaCoverageFeatures)
      .set({ coverageStatus: "covered", updatedAt: now })
      .where(
        and(
          inArray(qaCoverageFeatures.id, Array.from(tagFeatureIds)),
          inArray(qaCoverageFeatures.coverageStatus, [
            "none",
            "heuristic_only",
          ]),
        ),
      );
  }
  const kwOnly = Array.from(kwFeatureIds).filter(
    (id) => !tagFeatureIds.has(id),
  );
  if (kwOnly.length > 0) {
    await db
      .update(qaCoverageFeatures)
      .set({ coverageStatus: "heuristic_only", updatedAt: now })
      .where(
        and(
          inArray(qaCoverageFeatures.id, kwOnly),
          eq(qaCoverageFeatures.coverageStatus, "none"),
        ),
      );
  }

  return {
    tagLinks: tagLinks.length,
    kwLinks: kwLinks.length,
    tagFeatures: tagFeatureIds.size,
    kwOnlyFeatures: kwOnly.length,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const proposals = await buildProposals();

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(proposals, null, 2), "utf-8");

  const predictedTagLinks = proposals.reduce(
    (sum, p) => sum + p.tagMatches.reduce((s, m) => s + m.testTitles.length, 0),
    0,
  );
  const predictedKwLinks = proposals.reduce(
    (sum, p) => sum + p.keywordMatches.length * p.keywordTestTitles.length,
    0,
  );
  const tagFeatures = new Set(
    proposals.flatMap((p) => p.tagMatches.map((m) => m.featureId)),
  );
  const kwFeatures = new Set(
    proposals.flatMap((p) => p.keywordMatches.map((m) => m.featureId)),
  );

  console.log(`📋 proposals: ${proposals.length} specs`);
  console.log(
    `   tag links: ${predictedTagLinks} · tag features: ${tagFeatures.size}`,
  );
  console.log(
    `   keyword links: ${predictedKwLinks} · keyword-only features: ${
      Array.from(kwFeatures).filter((id) => !tagFeatures.has(id)).length
    }`,
  );
  console.log(`   → ${OUTPUT_PATH}`);

  if (apply) {
    const result = await applyProposals(proposals);
    console.log(
      `\n✅ applied: tag=${result.tagLinks} (feat ${result.tagFeatures}) · kw=${result.kwLinks} (feat ${result.kwOnlyFeatures})`,
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
