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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            Makestar QA Dashboard
          </h1>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/dashboard"
              className="font-medium text-blue-600"
            >
              대시보드
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            최근 실행 요약
          </h2>
          <SummaryCards latestRun={latestRun} />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            실행 히스토리
          </h2>
          <RunsTable runs={runs} />
        </section>
      </main>
    </div>
  );
}
