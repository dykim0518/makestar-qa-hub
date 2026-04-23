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
  connected: number;
  covered: number;
  partial: number;
  heuristicOnly: number;
  manualOnly: number;
  pending: number;
  connectedPct: number;
  critical: number;
  criticalConnected: number;
  criticalCovered: number;
  minOrder: number;
};

type EvidenceSummary = {
  realFeatures: number;
  realLinks: number;
  tagLinks: number;
  heuristicLinks: number;
  manualLinks: number;
  failedRealLinks: number;
  latestRealRunAt: Date | null;
  latestAnyRunAt: Date | null;
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

function isConnectedStatus(status: string): boolean {
  return (
    status === "covered" ||
    status === "partial" ||
    status === "heuristic_only"
  );
}

function formatDateLabel(date: Date | null): string {
  if (!date) return "실측 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
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

function SignalChip({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "sky" | "amber" | "indigo" | "slate";
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneMap[tone]}`}
    >
      <span className="text-[11px] opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function StatCard({
  eyebrow,
  value,
  caption,
  tone = "slate",
}: {
  eyebrow: string;
  value: string;
  caption: string;
  tone?: "emerald" | "sky" | "amber" | "slate";
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
    sky: "border-sky-200 bg-sky-50/70 text-sky-950",
    amber: "border-amber-200 bg-amber-50/80 text-amber-950",
    slate: "border-[var(--card-border)] bg-[var(--card)] text-slate-950",
  };

  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {eyebrow}
      </div>
      <div className="mt-3 text-2xl font-bold leading-none md:text-3xl">
        {value}
      </div>
      <div className="mt-2 text-sm text-slate-600">{caption}</div>
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
    let connected = 0;
    let covered = 0;
    let partial = 0;
    let heuristicOnly = 0;
    let manualOnly = 0;
    let pending = 0;
    let weightSum = 0;
    let weightedScore = 0;

    for (const r of scoped) {
      const w = PRIORITY_WEIGHT[r.priority] ?? 1;
      weightSum += w;
      const s = score(r.coverageStatus);
      weightedScore += w * s;
      if (isConnectedStatus(r.coverageStatus)) connected += 1;
      if (r.coverageStatus === "covered") covered += 1;
      else if (r.coverageStatus === "partial") partial += 1;
      else if (r.coverageStatus === "heuristic_only") heuristicOnly += 1;
      else if (r.coverageStatus === "manual_only") manualOnly += 1;
      else pending += 1;
    }

    const connectedPct = total ? Math.round((connected / total) * 100) : 0;
    const verifiedPct = total
      ? Math.round(((covered + partial * 0.5) / total) * 100)
      : 0;
    const weightedPct = weightSum
      ? Math.round((weightedScore / weightSum) * 100)
      : 0;

    return {
      total,
      connected,
      covered,
      partial,
      heuristicOnly,
      manualOnly,
      pending,
      connectedPct,
      verifiedPct,
      weightedPct,
    };
  }, [scoped]);

  const critical = useMemo(() => {
    const criticalRows = scoped.filter(
      (r) => r.priority === "critical" || r.priority === "high",
    );
    const total = criticalRows.length;
    const connected = criticalRows.filter((r) =>
      isConnectedStatus(r.coverageStatus),
    ).length;
    const covered = criticalRows.filter(
      (r) => r.coverageStatus === "covered",
    ).length;
    const partial = criticalRows.filter(
      (r) => r.coverageStatus === "partial",
    ).length;
    const connectedPct = total ? Math.round((connected / total) * 100) : 0;
    const verifiedPct = total
      ? Math.round(((covered + partial * 0.5) / total) * 100)
      : 0;
    return { total, connected, covered, partial, connectedPct, verifiedPct };
  }, [scoped]);

  const evidence = useMemo<EvidenceSummary>(() => {
    let realFeatures = 0;
    let realLinks = 0;
    let tagLinks = 0;
    let heuristicLinks = 0;
    let manualLinks = 0;
    let failedRealLinks = 0;
    let latestRealRunAt: Date | null = null;
    let latestAnyRunAt: Date | null = null;

    for (const row of scoped) {
      if (row.links.some((link) => link.linkSource === "real")) {
        realFeatures += 1;
      }

      for (const link of row.links) {
        if (link.lastRunAt) {
          if (!latestAnyRunAt || link.lastRunAt > latestAnyRunAt) {
            latestAnyRunAt = link.lastRunAt;
          }
        }

        if (link.linkSource === "real") {
          realLinks += 1;
          if (
            link.lastStatus === "failed" ||
            link.lastStatus === "flaky"
          ) {
            failedRealLinks += 1;
          }
          if (link.lastRunAt) {
            if (!latestRealRunAt || link.lastRunAt > latestRealRunAt) {
              latestRealRunAt = link.lastRunAt;
            }
          }
          continue;
        }

        if (link.linkSource === "tag") {
          tagLinks += 1;
          continue;
        }

        if (link.linkSource === "heuristic") {
          heuristicLinks += 1;
          continue;
        }

        if (link.linkSource === "manual") {
          manualLinks += 1;
        }
      }
    }

    return {
      realFeatures,
      realLinks,
      tagLinks,
      heuristicLinks,
      manualLinks,
      failedRealLinks,
      latestRealRunAt,
      latestAnyRunAt,
    };
  }, [scoped]);

  const categories = useMemo<CategorySummary[]>(() => {
    const map = new Map<string, CategorySummary>();
    for (const r of scoped) {
      const category = r.category ?? "기타";
      if (!map.has(category)) {
        map.set(category, {
          category,
          total: 0,
          connected: 0,
          covered: 0,
          partial: 0,
          heuristicOnly: 0,
          manualOnly: 0,
          pending: 0,
          connectedPct: 0,
          critical: 0,
          criticalConnected: 0,
          criticalCovered: 0,
          minOrder: Number.MAX_SAFE_INTEGER,
        });
      }

      const group = map.get(category)!;
      group.total += 1;
      if (isConnectedStatus(r.coverageStatus)) group.connected += 1;
      if (r.coverageStatus === "covered") group.covered += 1;
      else if (r.coverageStatus === "partial") group.partial += 1;
      else if (r.coverageStatus === "heuristic_only") group.heuristicOnly += 1;
      else if (r.coverageStatus === "manual_only") group.manualOnly += 1;
      else group.pending += 1;
      if (r.priority === "critical" || r.priority === "high") {
        group.critical += 1;
        if (isConnectedStatus(r.coverageStatus)) {
          group.criticalConnected += 1;
        }
        if (r.coverageStatus === "covered") {
          group.criticalCovered += 1;
        }
      }
      if (r.displayOrder < group.minOrder) {
        group.minOrder = r.displayOrder;
      }
    }

    for (const group of map.values()) {
      group.connectedPct = group.total
        ? Math.round((group.connected / group.total) * 100)
        : 0;
    }

    return Array.from(map.values()).sort((a, b) => a.minOrder - b.minOrder);
  }, [scoped]);

  const signalTone =
    hero.pending === 0 && evidence.failedRealLinks === 0 ? "emerald" : "amber";
  const signalTitle =
    hero.pending === 0 && evidence.failedRealLinks === 0
      ? "운영 신호 양호"
      : "점검 필요 항목 존재";
  const signalDescription =
    hero.pending === 0 && evidence.failedRealLinks === 0
      ? `연결율 ${hero.connectedPct}% · 실측 ${hero.verifiedPct}% · 수동 확인 ${hero.manualOnly} · 최신 실측 ${formatDateLabel(
          evidence.latestRealRunAt ?? evidence.latestAnyRunAt,
        )}`
      : `연결율 ${hero.connectedPct}% · 실측 ${hero.verifiedPct}% · 연결 대기 ${hero.pending} · 실측 실패 ${evidence.failedRealLinks}건`;

  return (
    <div className="space-y-6">
      <section
        className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm md:p-8"
        aria-labelledby="coverage-hero-title"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="coverage-hero-title"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]"
                >
                  {productLabel}
                </h2>
                <p className="mt-2 text-lg font-semibold text-slate-900 md:text-xl">
                  커버리지 운영 현황
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                실측 기준 {hero.verifiedPct}%
              </div>
            </div>

            <div className="mt-6 flex items-end gap-3">
              <div className="text-6xl font-bold tracking-tight text-slate-950 md:text-7xl">
                {hero.connectedPct}
              </div>
              <div className="pb-2 text-2xl font-semibold text-slate-400 md:text-3xl">
                %
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar pct={hero.connectedPct} height="h-3" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <SignalChip label="실측 통과" value={`${hero.covered}`} tone="emerald" />
              {hero.partial > 0 && (
                <SignalChip
                  label="부분 실측"
                  value={`${hero.partial}`}
                  tone="amber"
                />
              )}
              {hero.heuristicOnly > 0 && (
                <SignalChip
                  label="테스트 연결"
                  value={`${hero.heuristicOnly}`}
                  tone="indigo"
                />
              )}
              {hero.manualOnly > 0 && (
                <SignalChip
                  label="수동 확인"
                  value={`${hero.manualOnly}`}
                  tone="sky"
                />
              )}
              <SignalChip label="연결 대기" value={`${hero.pending}`} />
              <SignalChip
                label="전체 기능"
                value={`${hero.total}`}
                tone="sky"
              />
            </div>

            <div
              className={`mt-5 rounded-2xl border px-4 py-3 ${
                signalTone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <div className="text-sm font-semibold">{signalTitle}</div>
              <div className="mt-1 text-sm opacity-90">{signalDescription}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <StatCard
              eyebrow="우선순위 가중 기준"
              value={`${hero.weightedPct}%`}
              caption="Critical/High를 반영한 실측 점수"
              tone="sky"
            />
            <StatCard
              eyebrow="핵심 기능 연결"
              value={critical.total === 0 ? "미설정" : `${critical.connectedPct}%`}
              caption={
                critical.total === 0
                  ? "Critical + High 우선순위가 아직 지정되지 않았습니다."
                  : `Critical + High 연결 ${critical.connected}/${critical.total} · 실측 ${critical.verifiedPct}%`
              }
              tone={critical.total === 0 ? "slate" : "sky"}
            />
            <StatCard
              eyebrow="실측 기준"
              value={`${hero.verifiedPct}%`}
              caption={
                hero.partial > 0
                  ? `실측 통과 ${hero.covered}/${hero.total} · 부분 실측 ${hero.partial} · 실패 ${evidence.failedRealLinks}건`
                  : `실측 통과 ${hero.covered}/${hero.total} · 실패 ${evidence.failedRealLinks}건`
              }
              tone={evidence.failedRealLinks > 0 ? "amber" : "slate"}
            />
            <StatCard
              eyebrow="최신 기준"
              value={formatDateLabel(
                evidence.latestRealRunAt ?? evidence.latestAnyRunAt,
              )}
              caption={
                evidence.latestRealRunAt
                  ? "최근 실측 실행일"
                  : "실측 실행 이력 없음"
              }
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm md:p-6"
        aria-labelledby="coverage-evidence-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="coverage-evidence-title"
              className="text-sm font-semibold text-slate-900"
            >
              연결 근거 구성
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              실측, 정적 연결, 수동 확인이 현재 수치에 어떻게 반영됐는지 보여줍니다.
            </p>
          </div>
          <div className="text-xs text-[var(--muted)]">
            최신 실측 {formatDateLabel(evidence.latestRealRunAt)}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <SignalChip label="실측" value={`${evidence.realLinks}`} tone="emerald" />
          <SignalChip label="태그 연결" value={`${evidence.tagLinks}`} tone="sky" />
          <SignalChip
            label="정적 연결"
            value={`${evidence.heuristicLinks}`}
            tone="indigo"
          />
          <SignalChip label="수동 확인" value={`${evidence.manualLinks}`} />
        </div>
      </section>

      <section aria-labelledby="coverage-categories-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="coverage-categories-title"
              className="text-sm font-semibold text-slate-900"
            >
              카테고리별 진행 현황
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              카테고리를 선택하면 근거 테스트와 최근 실행 상태까지 볼 수 있습니다.
            </p>
          </div>
          <div className="text-xs text-[var(--muted)]">
            {categories.length}개 카테고리
          </div>
        </div>

        <ul className="grid gap-3">
          {categories.map((category) => (
            <li key={category.category}>
              <button
                type="button"
                onClick={() => onOpenCategory(category.category)}
                className="group w-full rounded-[24px] border border-[var(--card-border)] bg-[var(--card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white md:p-5"
                aria-label={`${category.category} 상세 보기`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold text-slate-950">
                        {category.category}
                      </div>
                      {category.critical > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          핵심 연결 {category.criticalConnected}/{category.critical}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span>
                        실측 {category.covered + category.partial}/{category.total}
                      </span>
                      {category.partial > 0 && (
                        <span className="text-amber-700">
                          부분 실측 {category.partial}
                        </span>
                      )}
                      {category.heuristicOnly > 0 && (
                        <span className="text-indigo-700">
                          테스트 연결 {category.heuristicOnly}
                        </span>
                      )}
                      {category.manualOnly > 0 && (
                        <span className="text-sky-700">
                          수동 확인 {category.manualOnly}
                        </span>
                      )}
                      {category.pending > 0 && (
                        <span className="text-slate-600">
                          연결 대기 {category.pending}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-4 md:block md:text-right">
                    <div className="text-3xl font-bold tracking-tight text-slate-950">
                      {category.connectedPct}%
                    </div>
                    <div className="mt-1 text-xs text-slate-500">연결율</div>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition group-hover:border-emerald-200 group-hover:text-emerald-700">
                      상세 보기
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.24a.75.75 0 0 1 0 1.08l-4.5 4.24a.75.75 0 0 1-1.06-.02Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <ProgressBar pct={category.connectedPct} height="h-2.5" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
