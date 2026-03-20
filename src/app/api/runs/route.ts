import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns } from "@/db/schema";
import { desc, eq, sql, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const suite = searchParams.get("suite");
  const status = searchParams.get("status");
  const environment = searchParams.get("environment");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const conditions = [];
  if (suite) conditions.push(eq(testRuns.suite, suite));
  if (status) conditions.push(eq(testRuns.status, status));
  if (environment) conditions.push(eq(testRuns.environment, environment));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [runs, countResult] = await Promise.all([
    db
      .select()
      .from(testRuns)
      .where(where)
      .orderBy(desc(testRuns.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(testRuns)
      .where(where),
  ]);

  return NextResponse.json({
    runs,
    total: Number(countResult[0].count),
  });
}
