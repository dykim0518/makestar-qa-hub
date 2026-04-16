"use client";

import { useState } from "react";
import Link from "next/link";
import type { TestRun } from "@/db/schema";
import type { DiffCategory, CompareTest } from "@/app/api/runs/compare/route";
import { StatusBadge } from "./StatusBadge";
import {
  formatDuration,
  formatDate,
  getPassRate,
  getPassRateNumber,
} from "@/lib/format";

interface CompareData {
  runA: TestRun;
  runB: TestRun;
  summary: Record<DiffCategory, number>;
  tests: CompareTest[];
}

const CATEGORY_CONFIG: Record<
  DiffCategory,
  { label: string; dot: string; color: string; bg: string; border: string }
> = {
  regression: {
    label: "새로 실패",
    dot: "bg-rose-500",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  fixed: {
    label: "복구됨",
    dot: "bg-emerald-500",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  still_failing: {
    label: "계속 실패",
    dot: "bg-orange-500",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  new: {
    label: "새 테스트",
    dot: "bg-blue-500",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  removed: {
    label: "삭제됨",
    dot: "bg-slate-400",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  stable: {
    label: "변동 없음",
    dot: "",
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-[var(--card-border)]",
  },
};

const STATUS_ARROW_COLOR: Record<string, string> = {
  passed: "text-emerald-600",
  failed: "text-rose-600",
  flaky: "text-amber-600",
  skipped: "text-slate-500",
};

function RunCard({ run, label }: { run: TestRun; label: string }) {
  const rate = getPassRateNumber(run.passed, run.total);
  return (
    <div className="flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <StatusBadge status={run.status} />
      </div>
      <div className="mb-2">
        <Link
          href={`/runs/${run.runId}`}
          className="font-mono text-lg font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          #{run.runId}
        </Link>
        <span className="ml-2 rounded-md border border-[var(--card-border)] bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
          {run.suite}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono">
          <span className="text-emerald-600">{run.passed}</span>
          <span className="text-[var(--muted)]"> / </span>
          <span className="text-slate-700">{run.total}</span>
          <span
            className={`ml-1 font-semibold ${
              rate >= 90
                ? "text-emerald-600"
                : rate >= 70
                  ? "text-amber-600"
                  : "text-rose-600"
            }`}
          >
            ({getPassRate(run.passed, run.total)})
          </span>
        </span>
        <span className="text-[var(--muted)]">|</span>
        <span className="font-mono text-[var(--muted)]">
          {formatDuration(run.durationMs)}
        </span>
      </div>
      <div className="mt-2 text-xs text-[var(--muted)]">
        {formatDate(run.createdAt)}
      </div>
    </div>
  );
}

export function RunCompare({ data }: { data: CompareData }) {
  const [activeFilters, setActiveFilters] = useState<Set<DiffCategory>>(
    () => new Set(["regression", "fixed", "still_failing", "new", "removed"]),
  );
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  function toggleFilter(category: DiffCategory) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  const filteredTests = data.tests.filter((t) => activeFilters.has(t.category));

  return (
    <div className="space-y-6">
      {/* Run summary cards */}
      <div className="flex gap-4">
        <RunCard run={data.runA} label="Run A (이전)" />
        <RunCard run={data.runB} label="Run B (이후)" />
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CATEGORY_CONFIG) as DiffCategory[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const count = data.summary[cat];
          const isActive = activeFilters.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleFilter(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : "border-[var(--card-border)] bg-slate-50 text-slate-500"
              } ${count === 0 ? "opacity-60" : "cursor-pointer hover:opacity-80"}`}
            >
              {cfg.dot && (
                <span
                  aria-hidden="true"
                  className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`}
                />
              )}
              <span>{cfg.label}</span>
              <span
                className={`ml-0.5 font-mono ${isActive ? cfg.color : "text-slate-500"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Test list */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
        <div className="border-b border-[var(--card-border)] px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            테스트 비교 결과
          </span>
          <span className="text-xs text-[var(--muted)]">
            {filteredTests.length}건 표시 / 전체 {data.tests.length}건
          </span>
        </div>

        {filteredTests.length === 0 ? (
          <div className="p-10 text-center text-[var(--muted)] text-sm">
            선택된 카테고리에 해당하는 테스트가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {filteredTests.map((test) => {
              const cfg = CATEGORY_CONFIG[test.category];
              const isExpanded = expandedTest === test.title;
              const hasError =
                test.errorMessage &&
                (test.category === "regression" ||
                  test.category === "still_failing" ||
                  test.category === "new");

              return (
                <div key={test.title}>
                  <div
                    className={`flex items-center gap-3 px-5 py-3 text-sm ${hasError ? "cursor-pointer hover:bg-slate-50" : ""}`}
                    onClick={() => {
                      if (hasError) {
                        setExpandedTest(isExpanded ? null : test.title);
                      }
                    }}
                  >
                    {/* Category badge */}
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color} ${cfg.border}`}
                    >
                      {cfg.dot && (
                        <span
                          aria-hidden="true"
                          className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                        />
                      )}
                      {cfg.label}
                    </span>

                    {/* Test title */}
                    <span className="flex-1 truncate text-slate-800">
                      {test.title}
                    </span>

                    {/* Status transition */}
                    <span className="shrink-0 flex items-center gap-1.5 font-mono text-xs">
                      <span
                        className={
                          test.statusA
                            ? STATUS_ARROW_COLOR[test.statusA] ||
                              "text-slate-500"
                            : "text-slate-500"
                        }
                      >
                        {test.statusA ?? "—"}
                      </span>
                      <span className="text-[var(--muted)]">→</span>
                      <span
                        className={
                          test.statusB
                            ? STATUS_ARROW_COLOR[test.statusB] ||
                              "text-slate-500"
                            : "text-slate-500"
                        }
                      >
                        {test.statusB ?? "—"}
                      </span>
                    </span>

                    {/* Duration change */}
                    <span className="shrink-0 w-24 text-right font-mono text-xs text-[var(--muted)]">
                      {test.durationA != null && test.durationB != null ? (
                        <>
                          {formatDuration(test.durationA)} →{" "}
                          {formatDuration(test.durationB)}
                        </>
                      ) : test.durationB != null ? (
                        formatDuration(test.durationB)
                      ) : test.durationA != null ? (
                        formatDuration(test.durationA)
                      ) : (
                        "—"
                      )}
                    </span>

                    {/* Expand indicator */}
                    {hasError && (
                      <svg
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Error message (expanded) */}
                  {isExpanded && hasError && (
                    <div className="border-t border-[var(--card-border)] bg-rose-50 px-5 py-3">
                      <pre className="whitespace-pre-wrap break-all font-mono text-xs text-rose-700 max-h-40 overflow-y-auto">
                        {test.errorMessage}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
