import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration, formatDate, getPassRate } from "@/lib/format";
import { TestCasesList } from "@/components/TestCasesList";
import type { TestRun, TestCase } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getRunData(
  runId: number
): Promise<{ run: TestRun; cases: TestCase[] } | null> {
  try {
    const { db } = await import("@/db");
    const { testRuns, testCases } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [run] = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.runId, runId))
      .limit(1);
    if (!run) return null;

    const cases = await db
      .select()
      .from(testCases)
      .where(eq(testCases.runId, runId));

    return { run, cases };
  } catch {
    const { mockRuns, mockTestCases } = await import("@/lib/mock-data");
    const run = mockRuns.find((r) => r.runId === runId);
    if (!run) return null;
    const cases = mockTestCases.filter((c) => c.runId === runId);
    return { run, cases };
  }
}

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId: runIdStr } = await params;
  const runId = parseInt(runIdStr, 10);
  if (isNaN(runId)) notFound();

  const data = await getRunData(runId);
  if (!data) notFound();

  const { run, cases } = data;
  const failedCases = cases.filter((c) => c.status === "failed");
  const flakyCases = cases.filter((c) => c.status === "flaky");
  const passedCases = cases.filter((c) => c.status === "passed");
  const skippedCases = cases.filter((c) => c.status === "skipped");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            <Link href="/dashboard" className="hover:text-blue-600">
              Makestar QA Dashboard
            </Link>
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; 대시보드로 돌아가기
          </Link>
        </div>

        <div className="mb-8 rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-2xl font-bold">Run #{run.runId}</h2>
            <StatusBadge status={run.status} />
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm">
              {run.suite}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
            <div>
              <p className="text-gray-500">성공률</p>
              <p className="text-lg font-bold">
                {getPassRate(run.passed, run.total)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">통과/전체</p>
              <p className="text-lg font-bold font-mono">
                {run.passed}/{run.total}
              </p>
            </div>
            <div>
              <p className="text-gray-500">소요 시간</p>
              <p className="text-lg font-bold">
                {formatDuration(run.durationMs)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">실행 일시</p>
              <p className="text-lg font-bold">{formatDate(run.createdAt)}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-6 text-sm text-gray-600">
            {run.branch && (
              <span>
                Branch: <code className="font-mono">{run.branch}</code>
              </span>
            )}
            {run.commitSha && (
              <span>
                Commit:{" "}
                <code className="font-mono">{run.commitSha.slice(0, 7)}</code>
              </span>
            )}
            <span>Triggered by: {run.triggeredBy}</span>
          </div>

          <div className="mt-4 flex gap-2">
            {run.flaky > 0 && (
              <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                Flaky: {run.flaky}
              </span>
            )}
            {run.skipped > 0 && (
              <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                Skipped: {run.skipped}
              </span>
            )}
          </div>
        </div>

        {failedCases.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-3 text-lg font-semibold text-red-700">
              실패한 테스트 ({failedCases.length})
            </h3>
            <TestCasesList cases={failedCases} showError />
          </section>
        )}

        {flakyCases.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-3 text-lg font-semibold text-yellow-700">
              Flaky 테스트 ({flakyCases.length})
            </h3>
            <TestCasesList cases={flakyCases} />
          </section>
        )}

        {passedCases.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-3 text-lg font-semibold text-green-700">
              통과한 테스트 ({passedCases.length})
            </h3>
            <TestCasesList cases={passedCases} />
          </section>
        )}

        {skippedCases.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-3 text-lg font-semibold text-gray-500">
              건너뛴 테스트 ({skippedCases.length})
            </h3>
            <TestCasesList cases={skippedCases} />
          </section>
        )}
      </main>
    </div>
  );
}
