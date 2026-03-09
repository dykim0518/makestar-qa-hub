import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns, testCases } from "@/db/schema";
import { validateApiSecret } from "@/lib/auth";
import { parsePlaywrightResults } from "@/lib/results-parser";

export async function POST(request: NextRequest) {
  const authError = validateApiSecret(request);
  if (authError) return authError;

  const runIdStr = request.headers.get("x-github-run-id");
  if (!runIdStr) {
    return NextResponse.json(
      { error: "Missing X-GitHub-Run-Id header" },
      { status: 400 }
    );
  }

  const runId = parseInt(runIdStr, 10);
  if (isNaN(runId)) {
    return NextResponse.json(
      { error: "Invalid X-GitHub-Run-Id" },
      { status: 400 }
    );
  }

  const suite = request.headers.get("x-github-suite") || "cmr";
  const commitSha = request.headers.get("x-github-sha") || null;
  const branch = request.headers.get("x-github-branch") || null;
  const triggeredBy = request.headers.get("x-github-triggered-by") || "push";

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = parsePlaywrightResults(body);

  await db.insert(testRuns).values({
    runId,
    suite,
    status: parsed.status,
    total: parsed.total,
    passed: parsed.passed,
    failed: parsed.failed,
    flaky: parsed.flaky,
    skipped: parsed.skipped,
    durationMs: parsed.durationMs,
    triggeredBy,
    commitSha,
    branch,
  }).onConflictDoUpdate({
    target: testRuns.runId,
    set: {
      status: parsed.status,
      total: parsed.total,
      passed: parsed.passed,
      failed: parsed.failed,
      flaky: parsed.flaky,
      skipped: parsed.skipped,
      durationMs: parsed.durationMs,
    },
  });

  if (parsed.testCases.length > 0) {
    const cases = parsed.testCases.map((tc) => ({ ...tc, runId }));
    // Batch insert in chunks of 100
    for (let i = 0; i < cases.length; i += 100) {
      await db.insert(testCases).values(cases.slice(i, i + 100));
    }
  }

  return NextResponse.json({
    ok: true,
    runId,
    total: parsed.total,
    passed: parsed.passed,
    failed: parsed.failed,
  });
}
