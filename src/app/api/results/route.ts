import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns, testCases } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateApiSecret } from "@/lib/auth";
import { parsePlaywrightResults } from "@/lib/results-parser";
import { sendSlackNotification } from "@/lib/slack-notifier";

export async function POST(request: NextRequest) {
  const authError = validateApiSecret(request);
  if (authError) return authError;

  const runIdStr = request.headers.get("x-github-run-id");
  if (!runIdStr) {
    return NextResponse.json(
      { error: "Missing X-GitHub-Run-Id header" },
      { status: 400 },
    );
  }

  const runId = parseInt(runIdStr, 10);
  if (isNaN(runId)) {
    return NextResponse.json(
      { error: "Invalid X-GitHub-Run-Id" },
      { status: 400 },
    );
  }

  const suite = request.headers.get("x-github-suite") || "cmr";
  const environment = request.headers.get("x-github-environment") || "prod";
  const commitSha = request.headers.get("x-github-sha") || null;
  const branch = request.headers.get("x-github-branch") || null;
  const triggeredBy = request.headers.get("x-github-triggered-by") || "push";

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parsePlaywrightResults(body);

  await db
    .insert(testRuns)
    .values({
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
      environment,
      commitSha,
      branch,
    })
    .onConflictDoUpdate({
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

  // 다른 "running" 상태의 run을 "cancelled"로 정리
  await db
    .update(testRuns)
    .set({ status: "cancelled" })
    .where(
      sql`${testRuns.status} = 'running' AND ${testRuns.runId} != ${runId}`,
    );

  // 기존 test_cases 삭제 후 재삽입 (upsert 대응)
  await db.delete(testCases).where(eq(testCases.runId, runId));

  if (parsed.testCases.length > 0) {
    const cases = parsed.testCases.map((tc) => ({ ...tc, runId }));
    for (let i = 0; i < cases.length; i += 100) {
      await db.insert(testCases).values(cases.slice(i, i + 100));
    }
  }

  // Slack 알림 (fire-and-forget)
  sendSlackNotification({
    runId,
    suite,
    status: parsed.status,
    total: parsed.total,
    passed: parsed.passed,
    failed: parsed.failed,
    flaky: parsed.flaky,
  });

  return NextResponse.json({
    ok: true,
    runId,
    total: parsed.total,
    passed: parsed.passed,
    failed: parsed.failed,
  });
}
