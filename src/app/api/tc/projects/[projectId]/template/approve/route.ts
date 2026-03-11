import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcTemplateProfiles } from "@/db/schema";
import { getProjectById } from "@/lib/tc-projects";
import { and, eq } from "drizzle-orm";

interface ApproveBody {
  profileId?: string;
  name?: string;
  columnMapping?: unknown;
  styleProfile?: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: ApproveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const profileId = body.profileId?.trim();
  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(tcTemplateProfiles)
    .where(
      and(
        eq(tcTemplateProfiles.id, profileId),
        eq(tcTemplateProfiles.projectId, projectId)
      )
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(tcTemplateProfiles)
    .set({
      name: body.name?.trim() || existing.name,
      status: "approved",
      columnMapping: body.columnMapping ?? existing.columnMapping,
      styleProfile: body.styleProfile ?? existing.styleProfile,
      updatedAt: new Date(),
    })
    .where(eq(tcTemplateProfiles.id, profileId))
    .returning();

  return NextResponse.json({ profile: updated });
}

