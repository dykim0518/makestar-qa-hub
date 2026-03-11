import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tcGeneratedCases,
  tcGenerationRuns,
  tcRequirements,
  tcValidationIssues,
} from "@/db/schema";
import { buildCoverageMatrix, validateRunCases } from "@/lib/tc-validator";
import { eq } from "drizzle-orm";

export async function POST(
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

  const [requirements, cases] = await Promise.all([
    db
      .select()
      .from(tcRequirements)
      .where(eq(tcRequirements.projectId, run.projectId)),
    db
      .select()
      .from(tcGeneratedCases)
      .where(eq(tcGeneratedCases.runId, runId)),
  ]);

  const { issues, summary } = validateRunCases(requirements, cases);
  const coverage = buildCoverageMatrix(requirements, cases);

  await db.delete(tcValidationIssues).where(eq(tcValidationIssues.runId, runId));
  if (issues.length > 0) {
    await db.insert(tcValidationIssues).values(
      issues.map((issue) => ({
        runId,
        issueType: issue.issueType,
        severity: issue.severity,
        targetRef: issue.targetRef,
        message: issue.message,
        meta: issue.meta ?? null,
      }))
    );
  }

  return NextResponse.json({
    runId,
    summary,
    issueCount: issues.length,
    issues,
    coverage,
  });
}

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

  const [issues, requirements, cases] = await Promise.all([
    db
      .select()
      .from(tcValidationIssues)
      .where(eq(tcValidationIssues.runId, runId)),
    db
      .select()
      .from(tcRequirements)
      .where(eq(tcRequirements.projectId, run.projectId)),
    db
      .select()
      .from(tcGeneratedCases)
      .where(eq(tcGeneratedCases.runId, runId)),
  ]);

  const summary = {
    totalCases: cases.length,
    duplicateCount: issues.filter((issue) => issue.issueType === "duplicate").length,
    missingCount: issues.filter((issue) => issue.issueType === "missing").length,
    formatCount: issues.filter((issue) => issue.issueType === "format").length,
    issueCount: issues.length,
    coverageRatio:
      requirements.length === 0
        ? 0
        : new Set(cases.map((testCase) => testCase.requirementId).filter(Boolean))
            .size / requirements.length,
  };
  const coverage = buildCoverageMatrix(requirements, cases);

  return NextResponse.json({
    runId,
    summary,
    issues,
    coverage,
  });
}
