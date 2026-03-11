import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcTemplateProfiles } from "@/db/schema";
import { getProjectById } from "@/lib/tc-projects";
import { and, desc, eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const status = request.nextUrl.searchParams.get("status");
  const where = status
    ? and(eq(tcTemplateProfiles.projectId, projectId), eq(tcTemplateProfiles.status, status))
    : eq(tcTemplateProfiles.projectId, projectId);

  const profiles = await db
    .select()
    .from(tcTemplateProfiles)
    .where(where)
    .orderBy(desc(tcTemplateProfiles.createdAt));

  return NextResponse.json({ profiles });
}

