import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns } from "@/db/schema";
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

  const [run] = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.runId, runId))
    .limit(1);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
