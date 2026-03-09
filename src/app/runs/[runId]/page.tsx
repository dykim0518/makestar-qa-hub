import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDuration, formatDate, getPassRate, getPassRateNumber } from "@/lib/format";
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
  const passRate = getPassRateNumber(run.passed, run.total);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <Link href="/dashboard" className="text-lg font-bold text-white hover:text-indigo-400 transition-colors">
              Makestar QA Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-indigo-400 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            대시보드로 돌아가기
          </Link>
        </div>

        {/* Run 요약 카드 */}
        <div className="mb-8 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          <div className="border-b border-[var(--card-border)] px-6 py-5">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">Run #{run.runId}</h2>
              <StatusBadge status={run.status} />
              <span className="rounded-md border border-[var(--card-border)] bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300">
                {run.suite}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[var(--card-border)] md:grid-cols-4">
            <StatCell
              label="성공률"
              value={getPassRate(run.passed, run.total)}
              color={passRate >= 90 ? "text-emerald-400" : passRate >= 70 ? "text-amber-400" : "text-rose-400"}
            />
            <StatCell
              label="통과 / 전체"
              value={`${run.passed} / ${run.total}`}
              color="text-slate-200"
              mono
            />
            <StatCell
              label="소요 시간"
              value={formatDuration(run.durationMs)}
              color="text-slate-200"
            />
            <StatCell
              label="실행 일시"
              value={formatDate(run.createdAt)}
              color="text-slate-200"
              small
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--card-border)] px-6 py-3.5">
            {run.branch && (
              <MetaTag icon="branch" value={run.branch} />
            )}
            {run.commitSha && (
              <MetaTag icon="commit" value={run.commitSha.slice(0, 7)} />
            )}
            <MetaTag icon="trigger" value={run.triggeredBy} />
            {run.flaky > 0 && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                Flaky: {run.flaky}
              </span>
            )}
            {run.skipped > 0 && (
              <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
                Skipped: {run.skipped}
              </span>
            )}
          </div>
        </div>

        {/* 테스트 케이스 섹션 */}
        {failedCases.length > 0 && (
          <TestSection
            title="실패한 테스트"
            count={failedCases.length}
            color="text-rose-400"
            dotColor="bg-rose-400"
          >
            <TestCasesList cases={failedCases} showError />
          </TestSection>
        )}

        {flakyCases.length > 0 && (
          <TestSection
            title="Flaky 테스트"
            count={flakyCases.length}
            color="text-amber-400"
            dotColor="bg-amber-400"
          >
            <TestCasesList cases={flakyCases} />
          </TestSection>
        )}

        {passedCases.length > 0 && (
          <TestSection
            title="통과한 테스트"
            count={passedCases.length}
            color="text-emerald-400"
            dotColor="bg-emerald-400"
          >
            <TestCasesList cases={passedCases} />
          </TestSection>
        )}

        {skippedCases.length > 0 && (
          <TestSection
            title="건너뛴 테스트"
            count={skippedCases.length}
            color="text-slate-400"
            dotColor="bg-slate-400"
          >
            <TestCasesList cases={skippedCases} />
          </TestSection>
        )}
      </main>
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
  mono,
  small,
}: {
  label: string;
  value: string;
  color: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-[var(--card)] px-6 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">
        {label}
      </p>
      <p
        className={`font-bold ${color} ${mono ? "font-mono" : ""} ${small ? "text-base" : "text-lg"}`}
      >
        {value}
      </p>
    </div>
  );
}

function MetaTag({ icon, value }: { icon: string; value: string }) {
  const icons: Record<string, React.ReactNode> = {
    branch: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.03a4.5 4.5 0 00-6.364-6.364L4.5 8.737" />
      </svg>
    ),
    commit: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    trigger: (
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
    ),
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
      {icons[icon]}
      <code className="font-mono text-slate-400">{value}</code>
    </span>
  );
}

function TestSection({
  title,
  count,
  color,
  dotColor,
  children,
}: {
  title: string;
  count: number;
  color: string;
  dotColor: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${color}`}>
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        {title}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-bold">
          {count}
        </span>
      </h3>
      {children}
    </section>
  );
}
