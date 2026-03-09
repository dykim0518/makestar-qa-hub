"use client";

import Link from "next/link";
import type { TestRun } from "@/db/schema";
import { StatusBadge } from "./StatusBadge";
import { formatDuration, formatDate, getPassRate } from "@/lib/format";

export function RunsTable({ runs }: { runs: TestRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        표시할 실행 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Run ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Suite
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              상태
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              통과/전체
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              성공률
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              소요 시간
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              Branch
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
              일시
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {runs.map((run) => (
            <tr key={run.runId} className="hover:bg-gray-50 transition-colors">
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <Link
                  href={`/runs/${run.runId}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  #{run.runId}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
                  {run.suite}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <StatusBadge status={run.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-mono">
                {run.passed}/{run.total}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-bold">
                {getPassRate(run.passed, run.total)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                {formatDuration(run.durationMs)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-600">
                {run.branch || "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {formatDate(run.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
