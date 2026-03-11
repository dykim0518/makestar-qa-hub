import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcGeneratedCases } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const cases = await db
    .select()
    .from(tcGeneratedCases)
    .where(eq(tcGeneratedCases.runId, runId))
    .orderBy(asc(tcGeneratedCases.id));

  return NextResponse.json({ cases });
}

