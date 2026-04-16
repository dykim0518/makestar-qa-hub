"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TestRun } from "@/db/schema";
import { StatusBadge } from "./StatusBadge";
import {
  formatDuration,
  formatDate,
  formatRelativeTime,
  getPassRateNumber,
  shortRunId,
} from "@/lib/format";

function PassRateBar({ rate }: { rate: number }) {
  const color =
    rate >= 90 ? "bg-emerald-500" : rate >= 70 ? "bg-amber-500" : "bg-rose-500";
  const textColor =
    rate >= 90
      ? "text-emerald-700"
      : rate >= 70
        ? "text-amber-600"
        : "text-rose-600";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-semibold ${textColor}`}>
        {rate}%
      </span>
    </div>
  );
}

function CheckboxButton({
  checked,
  disabled,
  onClick,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150
        ${
          checked
            ? "border-slate-500 bg-slate-500 shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }
        disabled:opacity-20 disabled:cursor-not-allowed`}
    >
      {checked && (
        <svg className="h-4 w-4 text-white" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function RunCardMobile({
  run,
  isSelected,
  canSelect,
  compareMode,
  onToggle,
}: {
  run: TestRun;
  isSelected: boolean;
  canSelect: boolean;
  compareMode: boolean;
  onToggle: () => void;
}) {
  const rate = getPassRateNumber(run.passed, run.total);
  const hasFailure = run.failed > 0;
  const hasFlaky = run.flaky > 0;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3.5 transition-colors ${
        hasFailure ? "border-l-2 border-l-rose-500" : ""
      } ${isSelected ? "bg-slate-50 border-slate-300" : ""}`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${
          hasFailure
            ? "bg-rose-500"
            : run.status === "running"
              ? "bg-indigo-500"
              : "bg-emerald-500"
        }`}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* L1: Run ID · Status · Suite · Env */}
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/runs/${run.runId}`}
              className="font-mono text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              title={`#${run.runId}`}
            >
              {shortRunId(run.runId)}
            </Link>
            <StatusBadge status={run.status} />
            <span className="rounded-md border border-[var(--card-border)] bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              {run.suite}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                run.environment === "stg"
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-600"
                  : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              }`}
            >
              {run.environment === "stg" ? "STG" : "PROD"}
            </span>
          </div>

          {/* L2: Results + Pass rate bar */}
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-sm text-slate-600">
              <span className="text-emerald-700">{run.passed}</span>
              <span className="text-[var(--muted)]"> / </span>
              <span>{run.total}</span>
            </span>
            {hasFailure && (
              <span className="text-xs font-medium text-rose-700">
                · {run.failed} failed
              </span>
            )}
            {hasFlaky && (
              <span className="text-xs font-medium text-amber-700">
                · {run.flaky} flaky
              </span>
            )}
            <span className="ml-auto">
              <PassRateBar rate={rate} />
            </span>
          </div>

          {/* L3: Duration · Relative time */}
          <div
            className="flex items-center gap-1.5 text-xs text-[var(--muted)]"
            title={formatDate(run.createdAt)}
          >
            <span className="font-mono">{formatDuration(run.durationMs)}</span>
            <span>·</span>
            <span>{formatRelativeTime(run.createdAt)}</span>
          </div>
        </div>

        {/* Checkbox (compare mode only on mobile) */}
        {compareMode && (
          <CheckboxButton
            checked={isSelected}
            disabled={!isSelected && !canSelect}
            onClick={onToggle}
            label={`Run #${run.runId} 비교 선택`}
          />
        )}
      </div>
    </div>
  );
}

export function RunsTable({ runs }: { runs: TestRun[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [compareMode, setCompareMode] = useState(false);

  function toggleCompareMode() {
    if (compareMode) setSelected(new Set());
    setCompareMode((prev) => !prev);
  }

  function toggleSelect(runId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        if (next.size >= 2) return prev;
        next.add(runId);
      }
      return next;
    });
  }

  function handleCompare() {
    const ids = Array.from(selected);
    if (ids.length !== 2) return;
    const [a, b] = ids.sort((x, y) => x - y);
    router.push(`/runs/compare?a=${a}&b=${b}`);
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center">
        <svg
          aria-hidden="true"
          className="mx-auto mb-3 h-10 w-10 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
          />
        </svg>
        <p className="mb-3 text-sm text-[var(--muted)]">
          표시할 실행 기록이 없습니다.
        </p>
        <Link
          href="/trigger"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          테스트 실행하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Mobile compare mode toggle */}
      <div className="mb-3 flex items-center justify-end gap-2 md:hidden">
        {compareMode && (
          <span className="text-xs text-[var(--muted)]">
            {selected.size}/2 선택
          </span>
        )}
        <button
          type="button"
          onClick={toggleCompareMode}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            compareMode
              ? "border-slate-400 bg-slate-100 text-slate-700"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {compareMode ? (
            "취소"
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                />
              </svg>
              Run 비교
            </>
          )}
        </button>
      </div>

      {/* Floating compare button */}
      {selected.size === 2 && (
        <div className="sticky top-4 z-10 mb-3 flex justify-center">
          <button
            onClick={handleCompare}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-200/60 backdrop-blur transition-all hover:bg-slate-50 hover:border-slate-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
            선택한 2개 Run 비교
          </button>
        </div>
      )}

      {/* Mobile card layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {runs.map((run) => (
          <RunCardMobile
            key={run.runId}
            run={run}
            isSelected={selected.has(run.runId)}
            canSelect={selected.size < 2}
            compareMode={compareMode}
            onToggle={() => toggleSelect(run.runId)}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <table className="min-w-full">
          <thead className="sticky top-0 z-10 bg-[var(--card)]">
            <tr className="border-b border-[var(--card-border)]">
              <th className="w-12 px-3 py-3.5 text-center">
                <span className="sr-only">선택</span>
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Run
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Suite / Env
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                상태
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                결과
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                성공률
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                소요 시간
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                일시
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {runs.map((run) => {
              const rate = getPassRateNumber(run.passed, run.total);
              const hasFailure = run.failed > 0;
              const hasFlaky = run.flaky > 0;
              const indicatorColor = hasFailure
                ? "bg-rose-500"
                : hasFlaky
                  ? "bg-amber-500"
                  : "";
              const isSelected = selected.has(run.runId);
              return (
                <tr
                  key={run.runId}
                  className={`transition-colors hover:bg-slate-50 ${hasFailure ? "bg-rose-50/50" : ""} ${isSelected ? "bg-slate-50" : ""}`}
                >
                  <td className="px-3 py-4 text-center">
                    <CheckboxButton
                      checked={isSelected}
                      disabled={!isSelected && selected.size >= 2}
                      onClick={() => toggleSelect(run.runId)}
                      label={`Run #${run.runId} 비교 선택`}
                    />
                  </td>
                  <td className="relative whitespace-nowrap px-5 py-4 text-sm">
                    {indicatorColor && (
                      <span
                        className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${indicatorColor}`}
                      />
                    )}
                    <Link
                      href={`/runs/${run.runId}`}
                      className="font-mono font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      #{run.runId}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded-md border border-[var(--card-border)] bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600">
                        {run.suite}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          run.environment === "stg"
                            ? "border border-amber-500/30 bg-amber-500/10 text-amber-600"
                            : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                        }`}
                      >
                        {run.environment === "stg" ? "STG" : "PROD"}
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span className="font-mono">
                        <span className="text-emerald-700">{run.passed}</span>
                        <span className="text-[var(--muted)]"> / </span>
                        <span className="text-slate-600">{run.total}</span>
                      </span>
                      {hasFailure && (
                        <span className="text-xs font-medium text-rose-700">
                          · {run.failed} failed
                        </span>
                      )}
                      {hasFlaky && (
                        <span className="text-xs font-medium text-amber-700">
                          · {run.flaky} flaky
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <PassRateBar rate={rate} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-mono text-[var(--muted)]">
                    {formatDuration(run.durationMs)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--muted)]">
                    {formatDate(run.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
