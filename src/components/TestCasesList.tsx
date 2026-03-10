"use client";

import { useState } from "react";
import type { TestCase } from "@/db/schema";
import { StatusBadge } from "./StatusBadge";
import { formatDuration } from "@/lib/format";

export function TestCasesList({
  cases,
  showError = false,
}: {
  cases: TestCase[];
  showError?: boolean;
}) {
  return (
    <div className="space-y-2">
      {cases.map((tc) => (
        <TestCaseRow key={tc.id} testCase={tc} showError={showError} />
      ))}
    </div>
  );
}

const STACK_PREVIEW_LINES = 5;

function TestCaseRow({
  testCase,
  showError,
}: {
  testCase: TestCase;
  showError: boolean;
}) {
  const [stackExpanded, setStackExpanded] = useState(false);
  const hasError =
    testCase.errorMessage &&
    (showError || testCase.status === "failed" || testCase.status === "flaky");

  const stackLines = testCase.errorStack?.split("\n") ?? [];
  const isStackLong = stackLines.length > STACK_PREVIEW_LINES;
  const visibleStack = stackExpanded
    ? testCase.errorStack
    : stackLines.slice(0, STACK_PREVIEW_LINES).join("\n");

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={testCase.status} />
          <span className="text-sm font-medium text-slate-200 truncate">
            {testCase.title}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs text-[var(--muted)]">
          {testCase.project && (
            <span className="rounded-md border border-[var(--card-border)] bg-white/5 px-2 py-0.5 font-mono">
              {testCase.project}
            </span>
          )}
          {testCase.file && (
            <span className="font-mono hidden md:inline">{testCase.file}</span>
          )}
          <span className="font-mono">{formatDuration(testCase.durationMs)}</span>
        </div>
      </div>

      {hasError && (
        <div className="border-t border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
            Error
          </p>
          <pre className="overflow-x-auto rounded-md bg-black/30 p-3 whitespace-pre-wrap text-xs text-rose-300/90 font-mono leading-relaxed">
            {testCase.errorMessage}
          </pre>
          {testCase.errorStack && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-rose-400/70">
                Stack trace
              </p>
              <pre className="overflow-x-auto rounded-md bg-black/40 p-3 whitespace-pre-wrap text-xs text-rose-300/60 font-mono leading-relaxed">
                {visibleStack}
              </pre>
              {isStackLong && (
                <button
                  onClick={() => setStackExpanded(!stackExpanded)}
                  className="mt-1.5 text-xs font-medium text-rose-400/70 hover:text-rose-400 transition-colors"
                >
                  {stackExpanded
                    ? "접기"
                    : `펼치기 (+${stackLines.length - STACK_PREVIEW_LINES}줄)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
