import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcRequirements, tcSources } from "@/db/schema";
import { normalizeSourceToRequirements } from "@/lib/tc-normalize";
import { getProjectById } from "@/lib/tc-projects";

interface FigmaSourceBody {
  url?: string;
  fileKey?: string;
  nodeId?: string;
  title?: string;
  metadataText?: string;
}

function buildFigmaRef(body: FigmaSourceBody): string {
  if (body.url?.trim()) return body.url.trim();

  const fileKey = body.fileKey?.trim();
  const nodeId = body.nodeId?.trim();
  if (!fileKey) return "";

  return nodeId ? `figma://${fileKey}/${nodeId}` : `figma://${fileKey}`;
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

  let body: FigmaSourceBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceRef = buildFigmaRef(body);
  if (!sourceRef) {
    return NextResponse.json(
      { error: "url 또는 fileKey는 필수입니다." },
      { status: 400 }
    );
  }

  const metadataText = body.metadataText?.trim() ?? "";
  const normalized = metadataText
    ? normalizeSourceToRequirements("figma", metadataText)
    : [];

  const [source] = await db
    .insert(tcSources)
    .values({
      projectId,
      sourceType: "figma",
      sourceRef,
      sourceTitle: body.title?.trim() || "Figma Source",
      sourceStatus: normalized.length > 0 ? "normalized" : "collected",
      rawContent: {
        url: body.url ?? null,
        fileKey: body.fileKey ?? null,
        nodeId: body.nodeId ?? null,
      },
      extractedText: metadataText || null,
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

