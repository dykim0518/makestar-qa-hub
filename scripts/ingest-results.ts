/**
 * Playwright JSON 리포트를 읽어 test_runs + coverage 매핑 업데이트.
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/ingest-results.ts <results.json> [suite]
 *
 * 인자:
 *   results.json: Playwright JSON reporter 결과 경로
 *   suite: 선택. 기본 "admin"
 *
 * 동작:
 *   1) test_runs insert (unique runId = Date.now())
 *   2) test_cases insert (제목/파일/상태)
 *   3) linkCoverageForRun 호출 — @feature 태그 추출하여 qa_coverage_test_links 업데이트
 */
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/db";
import { testRuns, testCases } from "../src/db/schema";
import { parsePlaywrightResults } from "../src/lib/results-parser";
import { linkCoverageForRun } from "../src/lib/coverage-linker";

async function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error(
      "Usage: tsx scripts/ingest-results.ts <results.json> [suite]",
    );
    process.exit(1);
  }
  const suite = process.argv[3] || "admin";
  // --reconcile: 이번 run에 없는 real 링크는 stale로 판정하여 삭제.
  // 전체 spec 실행 시에만 사용. --grep 같은 부분 실행에선 절대 쓰지 말 것.
  const reconcile = process.argv.includes("--reconcile");
  const abs = path.resolve(inputArg);
  if (!fs.existsSync(abs)) {
    console.error(`file not found: ${abs}`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(abs, "utf-8"));
  const parsed = parsePlaywrightResults(report);

  console.log(`파싱 결과:`);
  console.log(
    `  total ${parsed.total} · passed ${parsed.passed} · failed ${parsed.failed} · flaky ${parsed.flaky} · skipped ${parsed.skipped}`,
  );

  const runId = Date.now();
  await db.insert(testRuns).values({
    runId,
    suite,
    status: parsed.status,
    total: parsed.total,
    passed: parsed.passed,
    failed: parsed.failed,
    flaky: parsed.flaky,
    skipped: parsed.skipped,
    durationMs: parsed.durationMs,
    triggeredBy: "local",
  });

  if (parsed.testCases.length > 0) {
    const cases = parsed.testCases.map((testCase) => ({
      runId,
      title: testCase.title,
      file: testCase.file,
      project: testCase.project,
      status: testCase.status,
      durationMs: testCase.durationMs,
      errorMessage: testCase.errorMessage,
      errorStack: testCase.errorStack,
      errorCategory: testCase.errorCategory,
    }));
    for (let i = 0; i < cases.length; i += 100) {
      await db.insert(testCases).values(cases.slice(i, i + 100));
    }
  }

  const coverage = await linkCoverageForRun(
    runId,
    suite,
    parsed.testCases.map((tc) => ({
      title: tc.title,
      file: tc.file ?? null,
      status: tc.status,
      tags: tc.tags,
    })),
    new Date(),
    { reconcile },
  );
  if (reconcile)
    console.log("  (reconcile 모드: 이번 run에 없는 real 링크 정리)");
  console.log(
    `\n커버리지 업데이트: ${coverage.linked} links, ${coverage.updatedFeatures} features (stale 제거: ${coverage.staleRemoved})`,
  );

  if (parsed.failed > 0) {
    console.log("\n실패 테스트:");
    parsed.testCases
      .filter((t) => t.status === "failed")
      .forEach((t) => console.log(`  - ${t.title}`));
  }

  console.log(`\n✅ runId=${runId} ingested`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
