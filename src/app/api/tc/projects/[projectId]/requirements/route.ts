import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcRequirements } from "@/db/schema";
import { getProjectById } from "@/lib/tc-projects";
import { asc, eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sourceId = request.nextUrl.searchParams.get("sourceId");

  const requirements = sourceId
    ? await db
        .select()
        .from(tcRequirements)
        .where(eq(tcRequirements.sourceId, sourceId))
        .orderBy(asc(tcRequirements.requirementKey), asc(tcRequirements.createdAt))
    : await db
        .select()
        .from(tcRequirements)
        .where(eq(tcRequirements.projectId, projectId))
        .orderBy(asc(tcRequirements.requirementKey), asc(tcRequirements.createdAt));

  return NextResponse.json({ requirements });
}

