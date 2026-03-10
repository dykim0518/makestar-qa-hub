"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TestRun } from "@/db/schema";
import { StatusBadge } from "./StatusBadge";
import { formatDuration, formatDate, getPassRate, getPassRateNumber } from "@/lib/format";

export function RunsTable({ runs }: { runs: TestRun[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
      <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center text-[var(--muted)]">
        표시할 실행 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating compare button */}
      {selected.size === 2 && (
        <div className="sticky top-4 z-10 mb-3 flex justify-center">
          <button
            onClick={handleCompare}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-5 py-2 text-sm font-semibold text-indigo-400 shadow-lg shadow-indigo-500/10 backdrop-blur transition-all hover:bg-indigo-500/25 hover:border-indigo-500/50"
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

      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="w-10 px-3 py-3.5 text-center">
                <span className="sr-only">선택</span>
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Run
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Suite
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
                Branch
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
                  className={`transition-colors hover:bg-white/[0.02] ${hasFailure ? "bg-rose-500/[0.03]" : ""} ${isSelected ? "bg-indigo-500/[0.06]" : ""}`}
                >
                  <td className="px-3 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isSelected && selected.size >= 2}
                      onChange={() => toggleSelect(run.runId)}
                      className="h-4 w-4 rounded border-slate-600 bg-transparent text-indigo-500 focus:ring-indigo-500/30 focus:ring-offset-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="relative whitespace-nowrap px-5 py-4 text-sm">
                    {indicatorColor && (
                      <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${indicatorColor}`} />
                    )}
                    <Link
                      href={`/runs/${run.runId}`}
                      className="font-mono font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      #{run.runId}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <span className="rounded-md border border-[var(--card-border)] bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300">
                      {run.suite}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <span className="inline-flex items-center gap-2 font-mono text-slate-300">
                      <span>
                        <span className="text-emerald-400">{run.passed}</span>
                        <span className="text-[var(--muted)]"> / </span>
                        <span className="text-slate-300">{run.total}</span>
                      </span>
                      {hasFailure && (
                        <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                          F:{run.failed}
                        </span>
                      )}
                      {hasFlaky && (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                          FL:{run.flaky}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rate >= 90
                              ? "bg-emerald-500"
                              : rate >= 70
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span
                        className={`font-mono font-semibold text-xs ${
                          rate >= 90
                            ? "text-emerald-400"
                            : rate >= 70
                              ? "text-amber-400"
                              : "text-rose-400"
                        }`}
                      >
                        {getPassRate(run.passed, run.total)}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-mono text-[var(--muted)]">
                    {formatDuration(run.durationMs)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <span className="font-mono text-sm text-slate-400">
                      {run.branch || "-"}
                    </span>
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
