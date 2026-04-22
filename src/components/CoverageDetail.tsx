"use client";

import { Fragment, useMemo, useState } from "react";
import type { CoverageFeatureRow, CoverageLink } from "@/app/coverage/page";
import { StyledSelect } from "@/components/ui/StyledSelect";

type Props = {
  rows: CoverageFeatureRow[];
  product: string;
  productLabel: string;
  category: string;
  onBack: () => void;
};

type LinkSummary = {
  total: number;
  passed: number;
  failed: number;
  heuristic: number;
  skipped: number;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  covered: {
    label: "자동화(검증)",
    cls: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  partial: {
    label: "부분",
    cls: "border-amber-200 bg-amber-100 text-amber-800",
  },
  heuristic_only: {
    label: "추정",
    cls: "border-indigo-200 bg-indigo-100 text-indigo-800",
  },
  manual_only: {
    label: "수동만",
    cls: "border-sky-200 bg-sky-100 text-sky-800",
  },
  none: {
    label: "미커버",
    cls: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  critical: {
    label: "Critical",
    cls: "border-rose-200 bg-rose-100 text-rose-800",
  },
  high: {
    label: "High",
    cls: "border-orange-200 bg-orange-100 text-orange-800",
  },
  medium: {
    label: "Medium",
    cls: "border-slate-200 bg-slate-100 text-slate-700",
  },
  low: {
    label: "Low",
    cls: "border-slate-200 bg-slate-50 text-slate-500",
  },
};

const SOURCE_META: Record<string, { label: string; cls: string }> = {
  real: {
    label: "실측",
    cls: "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
  tag: {
    label: "태그",
    cls: "border-teal-200 bg-teal-100 text-teal-700",
  },
  heuristic: {
    label: "추정",
    cls: "border-indigo-200 bg-indigo-100 text-indigo-700",
  },
  manual: {
    label: "수동",
    cls: "border-sky-200 bg-sky-100 text-sky-700",
  },
};

const STATUS_GROUP_ORDER = [
  "failed",
  "flaky",
  "passed",
  "heuristic",
  "skipped",
  "other",
] as const;

const STATUS_GROUP_META: Record<
  string,
  { label: string; cls: string; dotCls: string }
> = {
  failed: {
    label: "실패",
    cls: "bg-rose-50 text-rose-700",
    dotCls: "bg-rose-500",
  },
  flaky: {
    label: "Flaky",
    cls: "bg-amber-50 text-amber-700",
    dotCls: "bg-amber-500",
  },
  passed: {
    label: "통과",
    cls: "bg-emerald-50 text-emerald-700",
    dotCls: "bg-emerald-500",
  },
  heuristic: {
    label: "휴리스틱(추정)",
    cls: "bg-indigo-50 text-indigo-700",
    dotCls: "bg-indigo-400",
  },
  skipped: {
    label: "스킵",
    cls: "bg-slate-100 text-slate-600",
    dotCls: "bg-slate-400",
  },
  other: {
    label: "기타",
    cls: "bg-slate-50 text-slate-500",
    dotCls: "bg-slate-300",
  },
};

function formatDateLabel(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function summarizeLinks(links: CoverageLink[]): LinkSummary {
  const measured = links.filter((link) => link.lastStatus !== null);
  return {
    total: measured.length,
    passed: measured.filter((link) => link.lastStatus === "passed").length,
    failed: measured.filter(
      (link) => link.lastStatus === "failed" || link.lastStatus === "flaky",
    ).length,
    heuristic: measured.filter((link) => link.lastStatus === "heuristic")
      .length,
    skipped: measured.filter((link) => link.lastStatus === "skipped").length,
  };
}

function summarizeSources(links: CoverageLink[]): Record<string, number> {
  return links.reduce<Record<string, number>>((acc, link) => {
    acc[link.linkSource] = (acc[link.linkSource] ?? 0) + 1;
    return acc;
  }, {});
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.none;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function SignalChip({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "sky" | "indigo" | "slate";
}) {
  const toneMap = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    sky: "border-sky-200 bg-sky-50 text-sky-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${toneMap[tone]}`}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function ProgressTrack({
  summary,
  className = "h-1.5",
}: {
  summary: LinkSummary;
  className?: string;
}) {
  if (summary.total === 0) {
    return <div className={`${className} rounded-full bg-slate-100`} />;
  }

  return (
    <div className={`${className} flex overflow-hidden rounded-full bg-slate-100`}>
      {summary.passed > 0 && (
        <div
          className="bg-emerald-500"
          style={{ width: `${(summary.passed / summary.total) * 100}%` }}
        />
      )}
      {summary.failed > 0 && (
        <div
          className="bg-rose-500"
          style={{ width: `${(summary.failed / summary.total) * 100}%` }}
        />
      )}
      {summary.heuristic > 0 && (
        <div
          className="bg-indigo-400"
          style={{ width: `${(summary.heuristic / summary.total) * 100}%` }}
        />
      )}
      {summary.skipped > 0 && (
        <div
          className="bg-slate-400"
          style={{ width: `${(summary.skipped / summary.total) * 100}%` }}
        />
      )}
    </div>
  );
}

function TestRatioBar({ links }: { links: CoverageLink[] }) {
  const summary = summarizeLinks(links);
  if (summary.total === 0) {
    return <span className="text-[var(--muted)]">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-slate-700">
          {summary.passed}/{summary.total}
        </span>
        {summary.failed > 0 && (
          <span className="text-rose-600">실패 {summary.failed}</span>
        )}
        {summary.heuristic > 0 && (
          <span className="text-indigo-600">추정 {summary.heuristic}</span>
        )}
      </div>
      <ProgressTrack summary={summary} className="h-1 w-24" />
    </div>
  );
}

function TestLinksList({
  links,
  compact = false,
}: {
  links: CoverageLink[];
  compact?: boolean;
}) {
  const [showAll, setShowAll] = useState(!compact);

  const grouped = useMemo(() => {
    const next = new Map<string, CoverageLink[]>();
    for (const link of links) {
      const key =
        link.lastStatus && STATUS_GROUP_META[link.lastStatus]
          ? link.lastStatus
          : "other";
      if (!next.has(key)) next.set(key, []);
      next.get(key)!.push(link);
    }
    return next;
  }, [links]);

  const sourceSummary = useMemo(() => summarizeSources(links), [links]);
  const orderedGroups = STATUS_GROUP_ORDER.filter((key) => grouped.has(key));

  if (links.length === 0) {
    return (
      <div className="px-5 py-4 text-xs text-[var(--muted)]">
        연결된 테스트 없음
      </div>
    );
  }

  const visibleGroups = orderedGroups.map((key) => {
    const items = grouped.get(key) ?? [];
    return {
      key,
      items: compact && !showAll ? items.slice(0, 2) : items,
      hiddenCount: compact && !showAll ? Math.max(items.length - 2, 0) : 0,
    };
  });
  const hiddenCount = visibleGroups.reduce(
    (count, group) => count + group.hiddenCount,
    0,
  );

  return (
    <div className="bg-slate-50/60">
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--card-border)] px-5 py-3">
        {orderedGroups.map((key) => {
          const meta = STATUS_GROUP_META[key];
          return (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dotCls}`}
              />
              {meta.label} {grouped.get(key)?.length ?? 0}
            </span>
          );
        })}
        <div className="h-5 w-px bg-slate-200" />
        {Object.entries(sourceSummary).map(([source, count]) => {
          const meta = SOURCE_META[source] ?? SOURCE_META.heuristic;
          return (
            <span
              key={source}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
            >
              {meta.label} {count}
            </span>
          );
        })}
      </div>

      {visibleGroups.map((group) => {
        const meta = STATUS_GROUP_META[group.key];
        return (
          <div key={group.key}>
            <div className="flex items-center gap-2 bg-white/70 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dotCls}`}
              />
              {meta.label}
              <span className="text-slate-400">
                ({grouped.get(group.key)?.length ?? 0})
              </span>
            </div>
            <div className="divide-y divide-[var(--card-border)]">
              {group.items.map((link) => {
                const sourceMeta =
                  SOURCE_META[link.linkSource] ?? SOURCE_META.heuristic;
                return (
                  <div
                    key={link.id}
                    className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${sourceMeta.cls}`}
                        >
                          {sourceMeta.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-800">
                            {link.testTitle}
                          </div>
                          {link.testFile && (
                            <div className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                              {link.testFile}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {link.lastRunAt && (
                      <div className="shrink-0 text-[10px] text-[var(--muted)]">
                        {formatDateLabel(link.lastRunAt)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {compact && hiddenCount > 0 && (
        <div className="border-t border-[var(--card-border)] px-5 py-3">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            숨은 테스트 {hiddenCount}건 더 보기
          </button>
        </div>
      )}
    </div>
  );
}

export function CoverageDetail({
  rows,
  product,
  productLabel,
  category,
  onBack,
}: Props) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const scoped = useMemo(() => {
    return rows
      .filter(
        (row) =>
          row.product === product &&
          (row.category ?? "기타") === category &&
          (filterStatus === "all" || row.coverageStatus === filterStatus),
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [rows, product, category, filterStatus]);

  const summary = useMemo(() => {
    const all = rows.filter(
      (row) => row.product === product && (row.category ?? "기타") === category,
    );
    const total = all.length;
    const covered = all.filter((row) => row.coverageStatus === "covered").length;
    const partial = all.filter((row) => row.coverageStatus === "partial").length;
    const remaining = total - covered - partial;
    const pct = total
      ? Math.round(((covered + partial * 0.5) / total) * 100)
      : 0;

    return { total, covered, partial, remaining, pct };
  }, [rows, product, category]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.24a.75.75 0 0 1 0-1.08l4.5-4.24a.75.75 0 0 1 1.06.02Z"
              clipRule="evenodd"
            />
          </svg>
          요약으로
        </button>
        <span className="text-[var(--muted)]">/</span>
        <span className="text-xs text-[var(--muted)]">{productLabel}</span>
        <span className="text-[var(--muted)]">/</span>
        <span className="text-xs font-semibold text-slate-700">{category}</span>
      </div>

      <section className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              {productLabel}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">
              {category}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              기능별 커버리지 근거와 최근 실행 상태를 확인할 수 있습니다.
            </p>
          </div>

          <div className="flex items-end gap-3">
            <div className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              {summary.pct}
            </div>
            <div className="pb-1 text-xl font-semibold text-slate-400">%</div>
          </div>
        </div>

        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${summary.pct}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <SignalChip label="자동화" value={`${summary.covered}`} tone="emerald" />
          {summary.partial > 0 && (
            <SignalChip label="부분" value={`${summary.partial}`} tone="amber" />
          )}
          <SignalChip label="남음" value={`${summary.remaining}`} tone="slate" />
          <SignalChip label="전체 기능" value={`${summary.total}`} tone="sky" />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-44">
          <StyledSelect
            aria-label="상태 필터"
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="all">전체 상태</option>
            <option value="covered">자동화(검증)</option>
            <option value="partial">부분</option>
            <option value="heuristic_only">추정</option>
            <option value="manual_only">수동만</option>
            <option value="none">미커버</option>
          </StyledSelect>
        </div>
        <div className="text-sm text-[var(--muted)] sm:ml-auto">
          현재 {scoped.length}개 항목
        </div>
      </div>

      {scoped.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-[var(--card-border)] bg-[var(--card)] px-5 py-8 text-center text-sm text-[var(--muted)]">
          선택한 조건에 맞는 기능이 없습니다.
        </div>
      )}

      {scoped.length > 0 && (
        <>
          <div className="grid gap-3 md:hidden">
            {scoped.map((row) => {
              const isExpanded = expandedRows.has(row.id);
              const summaryByLink = summarizeLinks(row.links);
              const sourceSummary = summarizeSources(row.links);
              const latestDate = formatDateLabel(row.lastRunAt);

              return (
                <article
                  key={row.id}
                  className="rounded-[24px] border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {row.pageTitle && (
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {row.pageTitle}
                        </div>
                      )}
                      <h2 className="mt-1 text-base font-semibold text-slate-950">
                        {row.featureName}
                      </h2>
                    </div>
                    <StatusBadge status={row.coverageStatus} />
                  </div>

                  <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Page
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-700">
                      {row.pagePath}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <PriorityBadge priority={row.priority} />
                    <SignalChip label="최근 실행" value={latestDate} />
                    <SignalChip label="근거" value={`${row.linkCount}건`} tone="sky" />
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-800">
                        테스트 상태
                      </span>
                      <span className="text-slate-500">
                        {summaryByLink.total > 0
                          ? `${summaryByLink.passed}/${summaryByLink.total} 통과`
                          : "실측 없음"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <ProgressTrack summary={summaryByLink} className="h-2" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {summaryByLink.failed > 0 && (
                        <SignalChip
                          label="실패"
                          value={`${summaryByLink.failed}`}
                          tone="amber"
                        />
                      )}
                      {summaryByLink.heuristic > 0 && (
                        <SignalChip
                          label="추정"
                          value={`${summaryByLink.heuristic}`}
                          tone="indigo"
                        />
                      )}
                      {Object.entries(sourceSummary).map(([source, count]) => {
                        const meta = SOURCE_META[source] ?? SOURCE_META.heuristic;
                        const tone =
                          source === "real"
                            ? "emerald"
                            : source === "tag"
                              ? "sky"
                              : source === "manual"
                                ? "slate"
                                : "indigo";
                        return (
                          <SignalChip
                            key={source}
                            label={meta.label}
                            value={`${count}`}
                            tone={tone}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {row.linkCount > 0 ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => toggleRow(row.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "근거 테스트 접기" : "근거 테스트 보기"}
                        <svg
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-[var(--muted)]">
                      연결된 테스트가 없습니다.
                    </div>
                  )}

                  {isExpanded && row.linkCount > 0 && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--card-border)]">
                      <TestLinksList links={row.links} compact />
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--card)] shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="w-14 px-4 py-3">근거</th>
                  <th className="px-4 py-3">페이지</th>
                  <th className="px-4 py-3">기능</th>
                  <th className="px-4 py-3">우선순위</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">테스트</th>
                  <th className="px-4 py-3">최근 실행</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {scoped.map((row) => {
                  const isExpanded = expandedRows.has(row.id);

                  return (
                    <Fragment key={row.id}>
                      <tr className={isExpanded ? "bg-slate-50/70" : "hover:bg-slate-50/50"}>
                        <td className="px-4 py-3 align-top">
                          {row.linkCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => toggleRow(row.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              aria-expanded={isExpanded}
                            >
                              {row.linkCount}건
                              <svg
                                aria-hidden="true"
                                className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.24 4.5a.75.75 0 0 1-1.08 0l-4.24-4.5a.75.75 0 0 1 .02-1.06Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-mono text-xs text-slate-700">
                            {row.pagePath}
                          </div>
                          {row.pageTitle && (
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {row.pageTitle}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-slate-900">
                          {row.featureName}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <PriorityBadge priority={row.priority} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusBadge status={row.coverageStatus} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <TestRatioBar links={row.links} />
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-[var(--muted)]">
                          {formatDateLabel(row.lastRunAt)}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={7}
                            className="border-t border-dashed border-[var(--card-border)] p-0"
                          >
                            <TestLinksList links={row.links} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
