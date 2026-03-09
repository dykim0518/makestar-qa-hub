import { SummaryCards } from "@/components/SummaryCards";
import { RunsTable } from "@/components/RunsTable";
import Link from "next/link";
import type { TestRun } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getRuns(): Promise<TestRun[]> {
  try {
    const { db } = await import("@/db");
    const { testRuns } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    return await db
      .select()
      .from(testRuns)
      .orderBy(desc(testRuns.createdAt))
      .limit(20);
  } catch {
    const { mockRuns } = await import("@/lib/mock-data");
    return mockRuns;
  }
}

export default async function DashboardPage() {
  const runs = await getRuns();
  const latestRun = runs[0] || null;

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
            <h1 className="text-lg font-bold text-white">
              Makestar QA Dashboard
            </h1>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/dashboard"
              className="rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 transition-colors hover:bg-indigo-500/20"
            >
              대시보드
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            최근 실행 요약
          </h2>
          <SummaryCards latestRun={latestRun} />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            실행 히스토리
          </h2>
          <RunsTable runs={runs} />
        </section>
      </main>
    </div>
  );
}
