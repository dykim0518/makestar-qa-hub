import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns } from "@/db/schema";
import { sql, and, gte, inArray, eq } from "drizzle-orm";

const VALID_SUITES = ["cmr", "albumbuddy", "admin"];
const VALID_DAYS = [7, 30, 90];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const suite = searchParams.get("suite");
  const environment = searchParams.get("environment");
  const days = Math.min(
    Math.max(parseInt(searchParams.get("days") || "30", 10), 1),
    90,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (VALID_DAYS.includes(days) ? days : 30));

  const conditions = [
    gte(testRuns.createdAt, cutoff),
    inArray(testRuns.status, ["passed", "failed"]),
  ];

  if (suite && VALID_SUITES.includes(suite)) {
    conditions.push(eq(testRuns.suite, suite));
  }
  if (environment) {
    conditions.push(eq(testRuns.environment, environment));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      date: sql<string>`to_char(${testRuns.createdAt}, 'YYYY-MM-DD')`,
      passed: sql<number>`coalesce(sum(${testRuns.passed}), 0)`,
      failed: sql<number>`coalesce(sum(${testRuns.failed}), 0)`,
      flaky: sql<number>`coalesce(sum(${testRuns.flaky}), 0)`,
      skipped: sql<number>`coalesce(sum(${testRuns.skipped}), 0)`,
      total: sql<number>`coalesce(sum(${testRuns.total}), 0)`,
      totalDurationMs: sql<number>`coalesce(sum(${testRuns.durationMs}), 0)`,
      runCount: sql<number>`count(*)`,
    })
    .from(testRuns)
    .where(where)
    .groupBy(sql`to_char(${testRuns.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${testRuns.createdAt}, 'YYYY-MM-DD')`);

  const points = rows.map((r) => {
    const passed = Number(r.passed);
    const failed = Number(r.failed);
    const flaky = Number(r.flaky);
    const skipped = Number(r.skipped);
    const total = Number(r.total);
    const totalDurationMs = Number(r.totalDurationMs);
    const runCount = Number(r.runCount);
    const passRate =
      total > 0
        ? Math.round(((passed / total) * 100 + Number.EPSILON) * 10) / 10
        : 0;
    const avgDurationMs =
      runCount > 0 ? Math.round(totalDurationMs / runCount) : 0;

    return {
      date: r.date,
      passRate,
      passed,
      failed,
      flaky,
      skipped,
      total,
      avgDurationMs,
      runCount,
    };
  });

  return NextResponse.json({ points });
}
