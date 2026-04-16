"use client";

import type { TestRun } from "@/db/schema";
import { getPassRate, getPassRateNumber, formatDuration } from "@/lib/format";

export function SummaryCards({ latestRun }: { latestRun: TestRun | null }) {
  const isEmpty = !latestRun;
  const passRate = isEmpty
    ? 0
    : getPassRateNumber(latestRun.passed, latestRun.total);

  const cards = isEmpty
    ? [
        {
          label: "총 테스트",
          value: "--" as string | number,
          icon: "layers",
          accent: "from-indigo-500 to-indigo-600",
          iconBg: "bg-slate-100 text-slate-600",
          hoverShadow: "hover:shadow-indigo-500/5",
        },
        {
          label: "통과",
          value: "--" as string | number,
          icon: "check",
          accent: "from-emerald-500 to-emerald-600",
          iconBg: "bg-emerald-50 text-emerald-700",
          hoverShadow: "hover:shadow-emerald-500/5",
        },
        {
          label: "실패",
          value: "--" as string | number,
          icon: "x",
          accent: "from-rose-500 to-rose-600",
          iconBg: "bg-rose-50 text-rose-600",
          hoverShadow: "hover:shadow-rose-500/5",
        },
        {
          label: "Flaky",
          value: "--" as string | number,
          icon: "flaky",
          accent: "from-amber-500 to-amber-600",
          iconBg: "bg-amber-50 text-amber-600",
          hoverShadow: "hover:shadow-amber-500/5",
        },
        {
          label: "성공률",
          value: "--" as string | number,
          icon: "percent",
          accent: "from-emerald-500 to-emerald-600",
          iconBg: "bg-emerald-50 text-emerald-700",
          hoverShadow: "hover:shadow-emerald-500/5",
        },
      ]
    : [
        {
          label: "총 테스트",
          value: latestRun.total as string | number,
          icon: "layers",
          accent: "from-indigo-500 to-indigo-600",
          iconBg: "bg-slate-100 text-slate-600",
          hoverShadow: "hover:shadow-indigo-500/5",
        },
        {
          label: "통과",
          value: latestRun.passed as string | number,
          icon: "check",
          accent: "from-emerald-500 to-emerald-600",
          iconBg: "bg-emerald-50 text-emerald-700",
          hoverShadow: "hover:shadow-emerald-500/5",
        },
        {
          label: "실패",
          value: latestRun.failed as string | number,
          icon: "x",
          accent: "from-rose-500 to-rose-600",
          iconBg: "bg-rose-50 text-rose-600",
          hoverShadow: "hover:shadow-rose-500/5",
        },
        {
          label: "Flaky",
          value: latestRun.flaky as string | number,
          icon: "flaky",
          accent: "from-amber-500 to-amber-600",
          iconBg: "bg-amber-50 text-amber-600",
          hoverShadow: "hover:shadow-amber-500/5",
        },
        {
          label: "성공률",
          value: getPassRate(latestRun.passed, latestRun.total) as
            | string
            | number,
          icon: "percent",
          accent:
            passRate >= 90
              ? "from-emerald-500 to-emerald-600"
              : passRate >= 70
                ? "from-amber-500 to-amber-600"
                : "from-rose-500 to-rose-600",
          iconBg:
            passRate >= 90
              ? "bg-emerald-50 text-emerald-700"
              : passRate >= 70
                ? "bg-amber-50 text-amber-600"
                : "bg-rose-50 text-rose-600",
          hoverShadow:
            passRate >= 90
              ? "hover:shadow-emerald-500/5"
              : passRate >= 70
                ? "hover:shadow-amber-500/5"
                : "hover:shadow-rose-500/5",
        },
      ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`group relative overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--accent)]/30 hover:shadow-lg sm:p-5 ${card.hoverShadow} ${card.label === "성공률" ? "col-span-2 sm:col-span-1" : ""} ${isEmpty ? "opacity-50" : ""}`}
        >
          <div
            className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b ${card.accent}`}
          />
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              {card.label}
            </p>
            <div className={`rounded-xl p-2 ${card.iconBg}`}>
              <CardIcon type={card.icon} />
            </div>
          </div>
          <p className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
            {card.value}
          </p>
          {card.label === "성공률" && !isEmpty && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${card.accent} transition-all`}
                style={{ width: `${passRate}%` }}
              />
            </div>
          )}
          {card.label === "총 테스트" && !isEmpty && latestRun && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {formatDuration(latestRun.durationMs)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function CardIcon({ type }: { type: string }) {
  switch (type) {
    case "layers":
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
          />
        </svg>
      );
    case "check":
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "x":
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "flaky":
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      );
    case "percent":
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      );
    default:
      return null;
  }
}
