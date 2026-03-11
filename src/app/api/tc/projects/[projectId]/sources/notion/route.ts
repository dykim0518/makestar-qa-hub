import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcRequirements, tcSources } from "@/db/schema";
import { normalizeSourceToRequirements } from "@/lib/tc-normalize";
import { getProjectById } from "@/lib/tc-projects";

interface NotionSourceBody {
  url?: string;
  title?: string;
  rawText?: string;
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

  let body: NotionSourceBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const rawText = body.rawText?.trim() ?? "";
  const normalized = rawText
    ? normalizeSourceToRequirements("notion", rawText)
    : [];

  const [source] = await db
    .insert(tcSources)
    .values({
      projectId,
      sourceType: "notion",
      sourceRef: url,
      sourceTitle: body.title?.trim() || "Notion Source",
      sourceStatus: normalized.length > 0 ? "normalized" : "collected",
      rawContent: { url, title: body.title ?? null },
      extractedText: rawText || null,
    })
    .returning();

  if (normalized.length > 0) {
    await db.insert(tcRequirements).values(
      normalized.map((item) => ({
        projectId,
        sourceId: source.id,
        requirementKey: item.requirementKey,
        title: item.title,
        body: item.body,
        tags: item.tags,
        priority: item.priority,
      }))
    );
  }

  return NextResponse.json(
    {
      source,
      insertedRequirements: normalized.length,
    },
    { status: 201 }
  );
}

