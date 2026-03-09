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
    <div className="rounded-lg border bg-white">
      <div
        className={`flex items-center justify-between px-4 py-3 ${hasError ? "cursor-pointer hover:bg-gray-50" : ""}`}
        onClick={() => hasError && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={testCase.status} />
          <span className="text-sm font-medium truncate">{testCase.title}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500">
          {testCase.project && (
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">
              {testCase.project}
            </span>
          )}
          {testCase.file && (
            <span className="font-mono hidden md:inline">{testCase.file}</span>
          )}
          <span>{formatDuration(testCase.durationMs)}</span>
          {hasError && (
            <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {expanded && testCase.errorMessage && (
        <div className="border-t bg-red-50 px-4 py-3">
          <p className="mb-2 text-sm font-medium text-red-800">Error:</p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-red-700 font-mono">
            {testCase.errorMessage}
          </pre>
          {testCase.errorStack && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-600 hover:underline">
                Stack trace
              </summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-red-600 font-mono">
                {testCase.errorStack}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
