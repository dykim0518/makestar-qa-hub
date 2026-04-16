import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns, testCases } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateApiSecret } from "@/lib/auth";
import { classifyError } from "@/lib/error-classifier";
import { sendSlackNotification } from "@/lib/slack-notifier";

export async function POST(request: NextRequest) {
  const authError = validateApiSecret(request);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, runId } = body;
  if (!event || !runId) {
    return NextResponse.json(
      { error: "Missing event or runId" },
      { status: 400 },
    );
  }

  try {
    switch (event) {
      case "begin": {
        const { suite, total, branch, commitSha, triggeredBy, environment } =
          body;
        await db
          .insert(testRuns)
          .values({
            runId,
            suite: suite || "cmr",
            status: "running",
            total: total || 0,
            passed: 0,
            failed: 0,
            flaky: 0,
            skipped: 0,
            durationMs: 0,
            triggeredBy: triggeredBy || "workflow_dispatch",
            environment: environment || "prod",
            commitSha: commitSha || null,
            branch: branch || null,
          })
          .onConflictDoUpdate({
            target: testRuns.runId,
            set: {
              status: "running",
              total: total || 0,
              passed: 0,
              failed: 0,
              flaky: 0,
              skipped: 0,
              durationMs: 0,
            },
          });

        // 기존 "running" 상태의 run을 "cancelled"로 변경 (취소된 이전 실행 정리)
        await db
          .update(testRuns)
          .set({ status: "cancelled" })
          .where(
            sql`${testRuns.status} = 'running' AND ${testRuns.runId} != ${runId}`,
          );

        // 이전 라이브 결과 정리
        await db.delete(testCases).where(eq(testCases.runId, runId));

        return NextResponse.json({ ok: true, event: "begin" });
      }

      case "test-end": {
        const {
          title,
          file,
          project,
          status,
          durationMs,
          errorMessage,
          errorStack,
        } = body;

        // 테스트 케이스 삽입
        const errorMsg = errorMessage || null;
        await db.insert(testCases).values({
          runId,
          title: title || "Unknown",
          file: file || null,
          project: project || null,
          status: status || "passed",
          durationMs: Math.round(durationMs || 0),
          errorMessage: errorMsg,
          errorStack: errorStack || null,
          errorCategory: classifyError(errorMsg),
        });

        // testRuns 카운터 업데이트
        const counterField =
          status === "passed"
            ? "passed"
            : status === "failed"
              ? "failed"
              : status === "flaky"
                ? "flaky"
                : "skipped";

        await db
          .update(testRuns)
          .set({
            [counterField]: sql`${testRuns[counterField]} + 1`,
            durationMs: sql`${testRuns.durationMs} + ${Math.round(durationMs || 0)}`,
          })
          .where(eq(testRuns.runId, runId));

        return NextResponse.json({ ok: true, event: "test-end" });
      }

      case "end": {
        const {
          status,
          suite,
          total,
          passed: passedCount,
          failed: failedCount,
          flaky: flakyCount,
        } = body;
        const finalStatus = status || "passed";
        await db
          .update(testRuns)
          .set({ status: finalStatus })
          .where(eq(testRuns.runId, runId));

        // Slack 알림 (fire-and-forget)
        sendSlackNotification({
          runId,
          suite: suite || "cmr",
          status: finalStatus,
          total: total || 0,
          passed: passedCount || 0,
          failed: failedCount || 0,
          flaky: flakyCount || 0,
        });

        return NextResponse.json({ ok: true, event: "end" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown event: ${event}` },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Live results error: ${message}` },
      { status: 500 },
    );
  }
}
