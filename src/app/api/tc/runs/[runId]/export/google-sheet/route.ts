import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  tcGeneratedCases,
  tcGenerationRuns,
  tcRequirements,
  tcValidationIssues,
} from "@/db/schema";
import {
  ensureSheets,
  extractSpreadsheetId,
  overwriteSheet,
} from "@/lib/google-sheets";
import { buildCoverageMatrix, validateRunCases } from "@/lib/tc-validator";
import { eq } from "drizzle-orm";

interface ExportBody {
  spreadsheetId?: string;
  sheetUrl?: string;
  tcSheetName?: string;
  validationSheetName?: string;
  coverageSheetName?: string;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export async function POST(
  request: NextRequest,
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

  let body: ExportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const spreadsheetInput = body.spreadsheetId?.trim() || body.sheetUrl?.trim();
  if (!spreadsheetInput) {
    return NextResponse.json(
      { error: "spreadsheetId 또는 sheetUrl이 필요합니다." },
      { status: 400 }
    );
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
  const tcSheetName = body.tcSheetName?.trim() || "TC";
  const validationSheetName = body.validationSheetName?.trim() || "Validation_Report";
  const coverageSheetName = body.coverageSheetName?.trim() || "Coverage_Matrix";

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

  // 저장된 이슈도 동기화
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

  const tcRows: Array<Array<string | number | null>> = [
    [
      "No",
      "Traceability",
      "Depth 1",
      "Depth 2",
      "Depth 3",
      "Pre-Condition",
      "Step",
      "Expected Result",
      "Result",
      "Issue Key",
      "Description",
    ],
    ...cases.map((testCase) => [
      testCase.no,
      testCase.traceability,
      testCase.depth1,
      testCase.depth2,
      testCase.depth3,
      testCase.preCondition,
      testCase.step,
      testCase.expectedResult,
      testCase.result,
      testCase.issueKey,
      testCase.description,
    ]),
  ];

  const validationRows: Array<Array<string | number | null>> = [
    ["Metric", "Value"],
    ["Run ID", runId],
    ["Total Cases", summary.totalCases],
    ["Issue Count", summary.issueCount],
    ["Duplicate Count", summary.duplicateCount],
    ["Missing Count", summary.missingCount],
    ["Format Count", summary.formatCount],
    ["Coverage Ratio", formatPercent(summary.coverageRatio)],
    [],
    ["Issue Type", "Severity", "Target", "Message"],
    ...issues.map((issue) => [
      issue.issueType,
      issue.severity,
      issue.targetRef || "",
      issue.message,
    ]),
  ];

  const coverageRows: Array<Array<string | number | null>> = [
    ["Requirement Key", "Requirement Title", "Covered", "Case Refs"],
    ...coverage.map((item) => [
      item.requirementKey,
      item.requirementTitle,
      item.covered ? "YES" : "NO",
      item.caseRefs.join(", "),
    ]),
  ];

  await ensureSheets(spreadsheetId, [
    tcSheetName,
    validationSheetName,
    coverageSheetName,
  ]);
  await overwriteSheet(spreadsheetId, tcSheetName, tcRows);
  await overwriteSheet(spreadsheetId, validationSheetName, validationRows);
  await overwriteSheet(spreadsheetId, coverageSheetName, coverageRows);

  return NextResponse.json({
    ok: true,
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: {
      tc: tcSheetName,
      validation: validationSheetName,
      coverage: coverageSheetName,
    },
    summary,
  });
}

