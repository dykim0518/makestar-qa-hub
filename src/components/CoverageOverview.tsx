"use client";

import { useMemo } from "react";
import type { CoverageFeatureRow } from "@/app/coverage/page";

type Props = {
  rows: CoverageFeatureRow[];
  product: string;
  productLabel: string;
  onOpenCategory: (category: string) => void;
};

type CategorySummary = {
  category: string;
  total: number;
  covered: number;
  partial: number;
  pct: number;
  critical: number;
  criticalCovered: number;
  minOrder: number;
};

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

function score(status: string): number {
  if (status === "covered") return 1;
  if (status === "partial") return 0.5;
  return 0;
}

function ProgressBar({
  pct,
  color = "emerald",
  height = "h-2",
}: {
  pct: number;
  color?: "emerald" | "rose" | "amber" | "slate";
  height?: string;
}) {
  const colorMap = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    slate: "bg-slate-400",
  };
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-full bg-slate-100`}
    >
      <div
        className={`h-full ${colorMap[color]} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function CoverageOverview({
  rows,
  product,
  productLabel,
  onOpenCategory,
}: Props) {
  const scoped = useMemo(
    () => rows.filter((r) => r.product === product),
    [rows, product],
  );

  const hero = useMemo(() => {
    const total = scoped.length;
    let covered = 0;
    let partial = 0;
    let weightSum = 0;
    let weightedScore = 0;
    for (const r of scoped) {
      const w = PRIORITY_WEIGHT[r.priority] ?? 1;
      weightSum += w;
      const s = score(r.coverageStatus);
      weightedScore += w * s;
      if (r.coverageStatus === "covered") covered += 1;
      else if (r.coverageStatus === "partial") partial += 1;
    }
    const simplePct = total
      ? Math.round(((covered + partial * 0.5) / total) * 100)
      : 0;
    const weightedPct = weightSum
      ? Math.round((weightedScore / weightSum) * 100)
      : 0;
    const remaining = total - covered - partial;
    return { total, covered, partial, remaining, simplePct, weightedPct };
  }, [scoped]);

  const critical = useMemo(() => {
    const criticalRows = scoped.filter(
      (r) => r.priority === "critical" || r.priority === "high",
    );
    const total = criticalRows.length;
    const covered = criticalRows.filter(
      (r) => r.coverageStatus === "covered",
    ).length;
    const partial = criticalRows.filter(
      (r) => r.coverageStatus === "partial",
    ).length;
    const pct = total
      ? Math.round(((covered + partial * 0.5) / total) * 100)
      : 0;
    return { total, covered, partial, pct };
  }, [scoped]);

  const categories = useMemo<CategorySummary[]>(() => {
    const map = new Map<string, CategorySummary>();
    for (const r of scoped) {
      const category = r.category ?? "기타";
      if (!map.has(category)) {
        map.set(category, {
          category,
          total: 0,
          covered: 0,
          partial: 0,
          pct: 0,
          critical: 0,
          criticalCovered: 0,
          minOrder: Number.MAX_SAFE_INTEGER,
        });
      }
      const g = map.get(category)!;
      g.total += 1;
      if (r.coverageStatus === "covered") g.covered += 1;
      else if (r.coverageStatus === "partial") g.partial += 1;
      if (r.priority === "critical" || r.priority === "high") {
        g.critical += 1;
        if (r.coverageStatus === "covered") g.criticalCovered += 1;
      }
      if (r.displayOrder < g.minOrder) g.minOrder = r.displayOrder;
    }
    for (const g of map.values()) {
      g.pct = g.total
        ? Math.round(((g.covered + g.partial * 0.5) / g.total) * 100)
        : 0;
    }
    return Array.from(map.values()).sort((a, b) => a.minOrder - b.minOrder);
  }, [scoped]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 md:p-8"
        aria-labelledby="coverage-hero-title"
      >
        <div className="flex items-center justify-between">
          <h2
            id="coverage-hero-title"
            className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]"
          >
            {productLabel} · 자동화 진행률
          </h2>
          <span className="text-xs text-[var(--muted)]">
            가중치 적용 {hero.weightedPct}%
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-3">
          <div className="text-5xl font-bold text-slate-900 md:text-6xl">
            {hero.simplePct}
          </div>
          <div className="text-2xl font-semibold text-slate-500">%</div>
        </div>
        <div className="mt-4">
          <ProgressBar pct={hero.simplePct} height="h-3" />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700">
          <span>
            <span className="font-semibold text-emerald-700">
              완료 {hero.covered}
            </span>
          </span>
          {hero.partial > 0 && (
            <span>
              <span className="font-semibold text-amber-700">
                부분 {hero.partial}
              </span>
            </span>
          )}
          <span>
            <span className="font-semibold text-slate-600">
              남음 {hero.remaining}
            </span>
          </span>
          <span className="text-[var(--muted)]">
            · 전체 {hero.total}개 기능
          </span>
        </div>
      </section>

      {/* 핵심 기능 */}
      {critical.total > 0 && (
        <section
          className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6"
          aria-labelledby="coverage-critical-title"
        >
          <div className="flex items-center justify-between">
            <h2
              id="coverage-critical-title"
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-800"
            >
              <span aria-hidden="true">🎯</span> 핵심 기능 커버리지
            </h2>
            <span className="text-xs text-emerald-700">Critical + High</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="text-4xl font-bold text-emerald-900">
              {critical.pct}
            </div>
            <div className="text-xl font-semibold text-emerald-700">%</div>
            <div className="ml-2 text-sm text-emerald-800">
              {critical.covered} / {critical.total}
              {critical.partial > 0 && ` (+${critical.partial} 부분)`}
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar pct={critical.pct} />
          </div>
        </section>
      )}

      {/* 카테고리 요약 */}
      <section aria-labelledby="coverage-categories-title">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="coverage-categories-title"
            className="text-sm font-semibold text-slate-700"
          >
            카테고리별 진행 현황
          </h2>
          <span className="text-xs text-[var(--muted)]">
            클릭하여 상세 보기
          </span>
        </div>
        <ul className="divide-y divide-[var(--card-border)] overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          {categories.map((c) => (
            <li key={c.category}>
              <button
                type="button"
                onClick={() => onOpenCategory(c.category)}
                className="group flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-slate-50"
                aria-label={`${c.category} 상세 보기`}
              >
                <div className="w-36 shrink-0 text-sm font-semibold text-slate-900">
                  {c.category}
                </div>
                <div className="flex-1">
                  <ProgressBar pct={c.pct} height="h-1.5" />
                </div>
                <div className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                  {c.pct}%
                </div>
                <div className="w-16 shrink-0 text-right text-xs tabular-nums text-[var(--muted)]">
                  {c.covered + c.partial}/{c.total}
                </div>
                {c.critical > 0 && (
                  <div className="hidden w-24 shrink-0 text-right text-[11px] text-emerald-700 md:block">
                    핵심 {c.criticalCovered}/{c.critical}
                  </div>
                )}
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.24a.75.75 0 0 1 0 1.08l-4.5 4.24a.75.75 0 0 1-1.06-.02Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
