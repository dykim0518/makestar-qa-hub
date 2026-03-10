import { notFound } from "next/navigation";
import { RunDetail } from "@/components/RunDetail";
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

  return <RunDetail run={data.run} initialCases={data.cases} />;
}
