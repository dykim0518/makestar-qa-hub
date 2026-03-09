"use client";

import Link from "next/link";
import type { TestRun } from "@/db/schema";
import { StatusBadge } from "./StatusBadge";
import { formatDuration, formatDate, getPassRate, getPassRateNumber } from "@/lib/format";

export function RunsTable({ runs }: { runs: TestRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center text-[var(--muted)]">
        표시할 실행 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-[var(--card-border)]">
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
            return (
              <tr
                key={run.runId}
                className="transition-colors hover:bg-white/[0.02]"
              >
                <td className="whitespace-nowrap px-5 py-4 text-sm">
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
                  <span className="font-mono text-slate-300">
                    <span className="text-emerald-400">{run.passed}</span>
                    <span className="text-[var(--muted)]"> / </span>
                    <span className="text-slate-300">{run.total}</span>
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
  );
}
