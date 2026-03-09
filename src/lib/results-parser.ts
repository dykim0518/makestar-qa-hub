import type { NewTestCase } from "@/db/schema";

interface PlaywrightResult {
  status: string;
  duration: number;
  errors?: Array<{ message?: string; stack?: string }>;
}

interface PlaywrightTest {
  title?: string;
  titlePath?: string[];
  projectName?: string;
  results?: PlaywrightResult[];
}

interface PlaywrightSpec {
  title?: string;
  titlePath?: string[];
  file?: string;
  line?: number;
  tests?: PlaywrightTest[];
}

interface PlaywrightSuite {
  title?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightReport {
  stats?: {
    expected?: number;
    unexpected?: number;
    flaky?: number;
    skipped?: number;
    duration?: number;
  };
  suites?: PlaywrightSuite[];
}

export interface ParsedResults {
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  durationMs: number;
  status: "passed" | "failed";
  testCases: Omit<NewTestCase, "runId">[];
}

const failedStates = new Set(["failed", "timedOut", "interrupted"]);

function determineTestStatus(
  results: PlaywrightResult[]
): "passed" | "failed" | "flaky" | "skipped" {
  if (results.length === 0) return "skipped";

  const hasFailure = results.some((r) => failedStates.has(r.status));
  const hasSuccess = results.some((r) => r.status === "passed");

  if (hasFailure && hasSuccess) return "flaky";
  if (hasFailure) return "failed";
  if (results.every((r) => r.status === "skipped")) return "skipped";
  return "passed";
}

export function parsePlaywrightResults(report: PlaywrightReport): ParsedResults {
  const stats = report.stats || {};
  const testCases: Omit<NewTestCase, "runId">[] = [];

  function walkSuite(suite: PlaywrightSuite) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const status = determineTestStatus(results);

        const titleParts = [
          ...(spec.titlePath || []),
          ...(test.titlePath || []),
        ].filter(Boolean);
        const title =
          titleParts.length > 0
            ? titleParts.join(" > ")
            : test.title || spec.title || "Unknown test";

        const totalDuration = results.reduce(
          (sum, r) => sum + (r.duration || 0),
          0
        );

        const firstError = results.find(
          (r) => failedStates.has(r.status) && r.errors?.length
        );
        const errorInfo = firstError?.errors?.[0];

        testCases.push({
          title,
          file: spec.file || null,
          project: test.projectName || null,
          status,
          durationMs: totalDuration,
          errorMessage: errorInfo?.message?.slice(0, 2000) || null,
          errorStack: errorInfo?.stack?.slice(0, 4000) || null,
        });
      }
    }
    for (const child of suite.suites || []) {
      walkSuite(child);
    }
  }

  for (const topSuite of report.suites || []) {
    walkSuite(topSuite);
  }

  const passed = testCases.filter((t) => t.status === "passed").length;
  const failed = testCases.filter((t) => t.status === "failed").length;
  const flaky = testCases.filter((t) => t.status === "flaky").length;
  const skipped = testCases.filter((t) => t.status === "skipped").length;

  return {
    total: testCases.length,
    passed,
    failed,
    flaky,
    skipped,
    durationMs: stats.duration || 0,
    status: failed > 0 ? "failed" : "passed",
    testCases,
  };
}
