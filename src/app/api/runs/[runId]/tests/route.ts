import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testCases } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId: runIdStr } = await params;
  const runId = parseInt(runIdStr, 10);
  if (isNaN(runId)) {
    return NextResponse.json({ error: "Invalid runId" }, { status: 400 });
  }

  const cases = await db
    .select()
    .from(testCases)
    .where(eq(testCases.runId, runId));

  return NextResponse.json(cases);
}
