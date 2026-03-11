import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tcGeneratedCases,
  tcGenerationRuns,
  tcRequirements,
  tcTemplateProfiles,
} from "@/db/schema";
import { getProjectById } from "@/lib/tc-projects";
import { generateCasesFromRequirements } from "@/lib/tc-generator";
import { and, desc, eq } from "drizzle-orm";

interface CreateRunBody {
  profileId?: string;
  mode?: "draft" | "strict";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const runs = await db
    .select()
    .from(tcGenerationRuns)
    .where(eq(tcGenerationRuns.projectId, projectId))
    .orderBy(desc(tcGenerationRuns.createdAt))
    .limit(50);

  return NextResponse.json({ runs });
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

  let body: CreateRunBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const profileId = body.profileId?.trim();
  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const mode: "draft" | "strict" = body.mode === "strict" ? "strict" : "draft";

  const [profile] = await db
    .select()
    .from(tcTemplateProfiles)
    .where(
      and(
        eq(tcTemplateProfiles.id, profileId),
        eq(tcTemplateProfiles.projectId, projectId)
      )
    )
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "Template profile not found" }, { status: 404 });
  }

  const requirements = await db
    .select()
    .from(tcRequirements)
    .where(eq(tcRequirements.projectId, projectId));

  if (requirements.length === 0) {
    return NextResponse.json(
      { error: "요구사항이 없습니다. 소스를 먼저 수집/정규화하세요." },
      { status: 400 }
    );
  }

  const [run] = await db
    .insert(tcGenerationRuns)
    .values({
      projectId,
      profileId,
      status: "running",
      mode,
    })
    .returning();

  try {
    const generated = generateCasesFromRequirements(requirements, profile, mode);

    if (generated.length > 0) {
      const values = generated.map((item) => ({
        runId: run.id,
        requirementId: item.requirementId,
        no: item.no,
        traceability: item.traceability,
        depth1: item.depth1,
        depth2: item.depth2,
        depth3: item.depth3,
        preCondition: item.preCondition,
        step: item.step,
        expectedResult: item.expectedResult,
        result: item.result,
        issueKey: item.issueKey,
        description: item.description,
      }));

      for (let i = 0; i < values.length; i += 200) {
        await db.insert(tcGeneratedCases).values(values.slice(i, i + 200));
      }
    }

    const [completed] = await db
      .update(tcGenerationRuns)
      .set({
        status: "completed",
        totalCases: generated.length,
        updatedAt: new Date(),
      })
      .where(eq(tcGenerationRuns.id, run.id))
      .returning();

    return NextResponse.json({
      run: completed,
      totalGeneratedCases: generated.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 생성 오류";

    const [failed] = await db
      .update(tcGenerationRuns)
      .set({
        status: "failed",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(tcGenerationRuns.id, run.id))
      .returning();

    return NextResponse.json({ run: failed, error: message }, { status: 500 });
  }
}

