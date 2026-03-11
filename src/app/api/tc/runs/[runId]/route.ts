import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcGenerationRuns } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const [run] = await db
    .select()
    .from(tcGenerationRuns)
    .where(eq(tcGenerationRuns.id, runId))
    .limit(1);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ run });
}

