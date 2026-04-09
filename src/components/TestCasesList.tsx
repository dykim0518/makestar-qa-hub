"use client";

import { useState } from "react";
import type { TestCase } from "@/db/schema";
import { StatusBadge } from "./StatusBadge";
import { ErrorCategoryBadge } from "./ErrorCategoryBadge";
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
          {testCase.errorCategory &&
            (testCase.status === "failed" || testCase.status === "flaky") && (
              <ErrorCategoryBadge category={testCase.errorCategory} />
            )}
          <span className="text-sm font-medium text-slate-700 truncate">
            {testCase.title}
          </span>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs text-[var(--muted)]">
          {testCase.project && (
            <span className="rounded-md border border-[var(--card-border)] bg-slate-50 px-2 py-0.5 font-mono">
              {testCase.project}
            </span>
          )}
          {testCase.file && (
            <span className="font-mono hidden md:inline">{testCase.file}</span>
          )}
          <span className="font-mono">
            {formatDuration(testCase.durationMs)}
          </span>
        </div>
      </div>

      {hasError && (
        <div className="border-t border-rose-200 bg-rose-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-600">
            Error
          </p>
          <pre className="overflow-x-auto rounded-md bg-rose-100/50 p-3 whitespace-pre-wrap text-xs text-rose-700 font-mono leading-relaxed">
            {testCase.errorMessage}
          </pre>
          {testCase.errorStack && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-rose-500">
                Stack trace
              </p>
              <pre className="overflow-x-auto rounded-md bg-rose-100/30 p-3 whitespace-pre-wrap text-xs text-rose-600/80 font-mono leading-relaxed">
                {visibleStack}
              </pre>
              {isStackLong && (
                <button
                  onClick={() => setStackExpanded(!stackExpanded)}
                  className="mt-1.5 text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors"
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
