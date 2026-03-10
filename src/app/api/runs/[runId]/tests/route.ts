import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testCases } from "@/db/schema";
import { eq, and, ilike, asc, desc, sql, type SQL } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId: runIdStr } = await params;
  const runId = parseInt(runIdStr, 10);
  if (isNaN(runId)) {
    return NextResponse.json({ error: "Invalid runId" }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const project = searchParams.get("project");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort");

  const conditions: SQL[] = [eq(testCases.runId, runId)];

  if (status) {
    conditions.push(eq(testCases.status, status));
  }
  if (project) {
    conditions.push(eq(testCases.project, project));
  }
  if (search) {
    conditions.push(ilike(testCases.title, `%${search}%`));
  }

  let orderBy;
  switch (sort) {
    case "duration_desc":
      orderBy = [desc(testCases.durationMs)];
      break;
    case "duration_asc":
      orderBy = [asc(testCases.durationMs)];
      break;
    case "title_asc":
      orderBy = [asc(testCases.title)];
      break;
    default:
      // status 우선: failed > flaky > passed > skipped
      orderBy = [
        asc(sql`CASE ${testCases.status}
          WHEN 'failed' THEN 0
          WHEN 'flaky' THEN 1
          WHEN 'passed' THEN 2
          WHEN 'skipped' THEN 3
          ELSE 4
        END`),
        asc(testCases.title),
      ];
  }

  const cases = await db
    .select()
    .from(testCases)
    .where(and(...conditions))
    .orderBy(...orderBy);

  return NextResponse.json(cases);
}
