import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns, testCases } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateApiSecret } from "@/lib/auth";

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
      { status: 400 }
    );
  }

  try {
    switch (event) {
      case "begin": {
        const { suite, total, branch, commitSha, triggeredBy } = body;
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

        // 이전 라이브 결과 정리
        await db.delete(testCases).where(eq(testCases.runId, runId));

        return NextResponse.json({ ok: true, event: "begin" });
      }

      case "test-end": {
        const { title, file, project, status, durationMs, errorMessage, errorStack } = body;

        // 테스트 케이스 삽입
        await db.insert(testCases).values({
          runId,
          title: title || "Unknown",
          file: file || null,
          project: project || null,
          status: status || "passed",
          durationMs: Math.round(durationMs || 0),
          errorMessage: errorMessage || null,
          errorStack: errorStack || null,
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
        const { status } = body;
        await db
          .update(testRuns)
          .set({ status: status || "passed" })
          .where(eq(testRuns.runId, runId));

        return NextResponse.json({ ok: true, event: "end" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown event: ${event}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Live results error: ${message}` },
      { status: 500 }
    );
  }
}
