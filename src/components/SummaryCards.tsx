"use client";

import type { TestRun } from "@/db/schema";
import { getPassRate, getPassRateNumber, formatDuration } from "@/lib/format";

export function SummaryCards({ latestRun }: { latestRun: TestRun | null }) {
  if (!latestRun) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center text-[var(--muted)]">
        아직 테스트 결과가 없습니다.
      </div>
    );
  }

  const passRate = getPassRateNumber(latestRun.passed, latestRun.total);

  const cards = [
    {
      label: "총 테스트",
      value: latestRun.total,
      icon: "layers",
      accent: "from-indigo-500 to-indigo-600",
      iconBg: "bg-indigo-500/10 text-indigo-400",
    },
    {
      label: "통과",
      value: latestRun.passed,
      icon: "check",
      accent: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "실패",
      value: latestRun.failed,
      icon: "x",
      accent: "from-rose-500 to-rose-600",
      iconBg: "bg-rose-500/10 text-rose-400",
    },
    {
      label: "성공률",
      value: getPassRate(latestRun.passed, latestRun.total),
      icon: "percent",
      accent:
        passRate >= 90
          ? "from-emerald-500 to-emerald-600"
          : passRate >= 70
            ? "from-amber-500 to-amber-600"
            : "from-rose-500 to-rose-600",
      iconBg:
        passRate >= 90
          ? "bg-emerald-500/10 text-emerald-400"
          : passRate >= 70
            ? "bg-amber-500/10 text-amber-400"
            : "bg-rose-500/10 text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--accent)]/30"
        >
          <div className={`absolute top-0 left-0 h-0.5 w-full bg-gradient-to-r ${card.accent}`} />
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              {card.label}
            </p>
            <div className={`rounded-lg p-1.5 ${card.iconBg}`}>
              <CardIcon type={card.icon} />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-white">
            {card.value}
          </p>
          {card.label === "성공률" && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${card.accent} transition-all`}
                style={{ width: `${passRate}%` }}
              />
            </div>
          )}
          {card.label === "총 테스트" && (
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
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
        </svg>
      );
    case "check":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "x":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "percent":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    default:
      return null;
  }
}
