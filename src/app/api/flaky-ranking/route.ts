import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testCases, testRuns } from "@/db/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") || "30", 10);
  const suite = searchParams.get("suite") || "";
  const environment = searchParams.get("environment") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  // Flaky 랭킹 쿼리
  const conditions = [gte(testRuns.createdAt, sinceDate)];
  if (suite) {
    conditions.push(eq(testRuns.suite, suite));
  }
  if (environment) {
    conditions.push(eq(testRuns.environment, environment));
  }

  const rankings = await db
    .select({
      title: testCases.title,
      flakyCount:
        sql<number>`count(*) filter (where ${testCases.status} = 'flaky')`.as(
          "flaky_count",
        ),
      totalRuns: sql<number>`count(*)`.as("total_runs"),
      flakyRate:
        sql<number>`round(count(*) filter (where ${testCases.status} = 'flaky') * 100.0 / count(*), 1)`.as(
          "flaky_rate",
        ),
    })
    .from(testCases)
    .innerJoin(testRuns, eq(testCases.runId, testRuns.runId))
    .where(and(...conditions))
    .groupBy(testCases.title)
    .having(sql`count(*) filter (where ${testCases.status} = 'flaky') > 0`)
    .orderBy(desc(sql`flaky_count`))
    .limit(limit);

  // 각 랭킹 항목의 최근 10회 결과 조회
  const rankingsWithHistory = await Promise.all(
    rankings.map(async (r) => {
      const historyConditions = [eq(testCases.title, r.title)];
      if (suite) {
        historyConditions.push(eq(testRuns.suite, suite));
      }

      const last10 = await db
        .select({
          status: testCases.status,
          runId: testCases.runId,
          createdAt: testRuns.createdAt,
        })
        .from(testCases)
        .innerJoin(testRuns, eq(testCases.runId, testRuns.runId))
        .where(and(...historyConditions))
        .orderBy(desc(testRuns.createdAt))
        .limit(10);

      return {
        ...r,
        last10Results: last10,
      };
    }),
  );

  return NextResponse.json({ rankings: rankingsWithHistory });
}
