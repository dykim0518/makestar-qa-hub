"use client";

import Link from "next/link";
import type { RunSummary, TestCaseResult } from "@/lib/types/trigger";
import { RunStatusDot } from "./RunStatusDot";
import { CaseGroup } from "./CaseGroup";
import { getSuiteLabel } from "@/lib/suite-label";

type TestResultsPanelProps = {
  latestRun: RunSummary | null;
  testCases: TestCaseResult[];
  casesLoading: boolean;
  triggered: boolean;
  waitingForNewRun: boolean;
  polling: boolean;
  pollingStopped: boolean;
  onRefresh: () => void;
  onResumePolling: () => void;
};

export function TestResultsPanel({
  latestRun,
  testCases,
  casesLoading,
  triggered,
  waitingForNewRun,
  polling,
  pollingStopped,
  onRefresh,
  onResumePolling,
}: TestResultsPanelProps) {
  const isRunning = latestRun?.status === "running";
  const completedCount = testCases.length;
  const totalCount = latestRun?.total || 0;

  const failedCases = testCases.filter((c) => c.status === "failed");
  const flakyCases = testCases.filter((c) => c.status === "flaky");
  const passedCases = testCases.filter((c) => c.status === "passed");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            {isRunning ? "실시간 테스트 결과" : "테스트 실행 결과"}
          </h2>
          {isRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              실행 중
            </span>
          )}
          {polling && !isRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              <svg
                className="h-2.5 w-2.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              대기 중
            </span>
          )}
        </div>
        {triggered && (
          <button
            onClick={onRefresh}
            className="rounded p-1.5 text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="새로고침"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 폴링 중지 알림 (실행 중인 경우에만) */}
      {pollingStopped && isRunning && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-xs text-amber-600">자동 갱신이 중지되었습니다.</p>
          <button
            onClick={onResumePolling}
            className="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-200"
          >
            다시 시작
          </button>
        </div>
      )}

      {!triggered ? (
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-12 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-[var(--muted)]/30"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
            />
          </svg>
          <p className="text-sm text-[var(--muted)]">
            테스트를 실행하면 결과가 여기에 표시됩니다
          </p>
        </div>
      ) : waitingForNewRun || (casesLoading && !latestRun) ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-10 text-center">
          <svg
            className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="mb-1 text-sm font-semibold text-slate-600">
            테스트 시작 대기 중
          </p>
          <p className="text-xs text-[var(--muted)]">
            GitHub Actions에서 실행이 시작되면 자동으로 결과가 표시됩니다
          </p>
        </div>
      ) : !latestRun ? (
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center text-sm text-[var(--muted)]">
          테스트 결과를 불러오는 중...
        </div>
      ) : (
        <>
          {/* Run 요약 헤더 */}
          <Link
            href={`/runs/${latestRun.runId}`}
            className="mb-3 flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
          >
            <div className="flex items-center gap-3">
              <RunStatusDot status={latestRun.status} />
              <div>
                <span className="text-sm font-semibold text-slate-700">
                  Run #{latestRun.runId}
                </span>
                <span className="ml-2 rounded border border-[var(--card-border)] bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                  {getSuiteLabel(latestRun.suite)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {isRunning ? (
                <span className="font-mono text-slate-600">
                  {completedCount} / {totalCount}
                </span>
              ) : (
                <>
                  <span className="font-semibold text-emerald-700">
                    {latestRun.passed}
                  </span>
                  <span className="text-[var(--muted)]">/</span>
                  <span className="text-slate-600">{latestRun.total}</span>
                </>
              )}
              {latestRun.failed > 0 && (
                <span className="ml-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                  {latestRun.failed} failed
                </span>
              )}
            </div>
          </Link>

          {/* 프로그레스 바 */}
          {isRunning && totalCount > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  진행률
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {Math.round((completedCount / totalCount) * 100)}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-slate-400 to-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min((completedCount / totalCount) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[var(--muted)]">
                {latestRun.passed > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    통과 {latestRun.passed}
                  </span>
                )}
                {latestRun.failed > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    실패 {latestRun.failed}
                  </span>
                )}
                {latestRun.flaky > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Flaky {latestRun.flaky}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 테스트 케이스 목록 */}
          <div className="max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto pr-1">
            {testCases.length === 0 && isRunning && (
              <div className="rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
                <svg
                  className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <p className="text-xs text-[var(--muted)]">
                  테스트 실행 준비 중...
                </p>
              </div>
            )}
            {failedCases.length > 0 && (
              <CaseGroup
                label="실패"
                count={failedCases.length}
                dotColor="bg-rose-400"
                cases={failedCases}
              />
            )}
            {flakyCases.length > 0 && (
              <CaseGroup
                label="Flaky"
                count={flakyCases.length}
                dotColor="bg-amber-400"
                cases={flakyCases}
              />
            )}
            {passedCases.length > 0 && (
              <CaseGroup
                label="통과"
                count={passedCases.length}
                dotColor="bg-emerald-500"
                cases={passedCases}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
