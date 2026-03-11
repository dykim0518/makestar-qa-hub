import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcSources } from "@/db/schema";
import { getProjectById } from "@/lib/tc-projects";
import { desc, eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sources = await db
    .select()
    .from(tcSources)
    .where(eq(tcSources.projectId, projectId))
    .orderBy(desc(tcSources.createdAt));

  return NextResponse.json({ sources });
}

