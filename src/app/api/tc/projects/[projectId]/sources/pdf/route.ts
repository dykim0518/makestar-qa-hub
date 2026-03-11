import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcRequirements, tcSources } from "@/db/schema";
import { normalizeSourceToRequirements } from "@/lib/tc-normalize";
import { getProjectById } from "@/lib/tc-projects";

export const runtime = "nodejs";

function extractReadableTextFromBuffer(buffer: Buffer): string {
  // PDF 바이너리를 전용 파서 없이 처리하는 MVP 단계에서는,
  // 가독 가능한 문자만 남겨 최소 정규화 입력을 확보한다.
  const utf8 = buffer.toString("utf8");
  const cleaned = utf8
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u3131-\uD79D]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 20) return "";
  return cleaned.slice(0, 120_000);
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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "multipart form-data의 file 필드가 필요합니다." },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extractedText = extractReadableTextFromBuffer(bytes);
  const normalized = extractedText
    ? normalizeSourceToRequirements("pdf", extractedText)
    : [];

  const [source] = await db
    .insert(tcSources)
    .values({
      projectId,
      sourceType: "pdf",
      sourceRef: file.name,
      sourceTitle: file.name,
      sourceStatus: normalized.length > 0 ? "normalized" : "collected",
      rawContent: {
        mimeType: file.type || null,
        size: file.size,
      },
      extractedText: extractedText || null,
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
      extraction: extractedText ? "text-heuristic" : "none",
    },
    { status: 201 }
  );
}

