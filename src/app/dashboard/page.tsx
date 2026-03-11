import { DashboardContent } from "@/components/DashboardContent";
import { DashboardGuide } from "@/components/DashboardGuide";
import { AppHeader } from "@/components/AppHeader";
import type { TestRun } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getRuns(): Promise<{ runs: TestRun[]; total: number }> {
  try {
    const { db } = await import("@/db");
    const { testRuns } = await import("@/db/schema");
    const { desc, sql } = await import("drizzle-orm");
    const [runs, countResult] = await Promise.all([
      db
        .select()
        .from(testRuns)
        .orderBy(desc(testRuns.createdAt))
        .limit(10),
      db.select({ count: sql<number>`count(*)` }).from(testRuns),
    ]);
    return { runs, total: Number(countResult[0].count) };
  } catch {
    const { mockRuns } = await import("@/lib/mock-data");
    return { runs: mockRuns, total: mockRuns.length };
  }
}

export default async function DashboardPage() {
  const { runs, total } = await getRuns();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader active="dashboard" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <DashboardContent initialRuns={runs} initialTotal={total} />
      </main>

      <DashboardGuide />
    </div>
  );
}
