import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const suite = searchParams.get("suite");
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  let query = db
    .select()
    .from(testRuns)
    .orderBy(desc(testRuns.createdAt))
    .limit(limit)
    .$dynamic();

  if (suite) {
    query = query.where(eq(testRuns.suite, suite));
  }
  if (status) {
    query = query.where(eq(testRuns.status, status));
  }

  const runs = await query;
  return NextResponse.json(runs);
}
