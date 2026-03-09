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

function TestCaseRow({
  testCase,
  showError,
}: {
  testCase: TestCase;
  showError: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasError = showError && testCase.errorMessage;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
      <div
        className={`flex items-center justify-between px-4 py-3 ${hasError ? "cursor-pointer hover:bg-white/[0.02]" : ""}`}
        onClick={() => hasError && setExpanded(!expanded)}
      >
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
          {hasError && (
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {expanded && testCase.errorMessage && (
        <div className="border-t border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
            Error
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-rose-300/90 font-mono leading-relaxed">
            {testCase.errorMessage}
          </pre>
          {testCase.errorStack && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-rose-400/70 hover:text-rose-400 transition-colors">
                Stack trace
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-rose-300/60 font-mono leading-relaxed">
                {testCase.errorStack}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
