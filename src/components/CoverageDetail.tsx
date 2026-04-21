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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  covered: {
    label: "자동화(검증)",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  partial: {
    label: "부분",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
  },
  heuristic_only: {
    label: "추정",
    cls: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  manual_only: {
    label: "수동만",
    cls: "bg-sky-100 text-sky-800 border-sky-200",
  },
  none: {
    label: "미커버",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

function Badge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.none;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  critical: {
    label: "Critical",
    cls: "bg-rose-100 text-rose-800 border-rose-200",
  },
  high: {
    label: "High",
    cls: "bg-orange-100 text-orange-800 border-orange-200",
  },
  medium: {
    label: "Medium",
    cls: "bg-slate-100 text-slate-700 border-slate-200",
  },
  low: { label: "Low", cls: "bg-slate-50 text-slate-500 border-slate-200" },
};

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function TestRatioBar({ links }: { links: { lastStatus: string | null }[] }) {
  const measuredLinks = links.filter((l) => l.lastStatus !== null);
  if (measuredLinks.length === 0) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  const passed = measuredLinks.filter((l) => l.lastStatus === "passed").length;
  const failed = measuredLinks.filter(
    (l) => l.lastStatus === "failed" || l.lastStatus === "flaky",
  ).length;
  const heuristic = measuredLinks.filter(
    (l) => l.lastStatus === "heuristic",
  ).length;
  const total = measuredLinks.length;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-slate-700">
          {passed}/{total}
        </span>
        {failed > 0 && <span className="text-rose-600">✗{failed}</span>}
      </div>
      <div className="flex h-1 w-20 overflow-hidden rounded-full bg-slate-100">
        {passed > 0 && (
          <div
            className="bg-emerald-500"
            style={{ width: `${(passed / total) * 100}%` }}
          />
        )}
        {failed > 0 && (
          <div
            className="bg-rose-500"
            style={{ width: `${(failed / total) * 100}%` }}
          />
        )}
        {heuristic > 0 && (
          <div
            className="bg-indigo-300"
            style={{ width: `${(heuristic / total) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

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
    cls: "text-rose-700 bg-rose-50",
    dotCls: "bg-rose-500",
  },
  flaky: {
    label: "Flaky",
    cls: "text-amber-700 bg-amber-50",
    dotCls: "bg-amber-500",
  },
  passed: {
    label: "통과",
    cls: "text-emerald-700 bg-emerald-50",
    dotCls: "bg-emerald-500",
  },
  heuristic: {
    label: "휴리스틱(추정)",
    cls: "text-indigo-700 bg-indigo-50",
    dotCls: "bg-indigo-400",
  },
  skipped: {
    label: "스킵",
    cls: "text-slate-600 bg-slate-100",
    dotCls: "bg-slate-400",
  },
  other: {
    label: "기타",
    cls: "text-slate-500 bg-slate-50",
    dotCls: "bg-slate-300",
  },
};

function TestLinksList({ links }: { links: CoverageLink[] }) {
  if (links.length === 0) {
    return (
      <div className="px-6 py-3 text-xs text-[var(--muted)]">
        연결된 테스트 없음
      </div>
    );
  }
  const grouped = new Map<string, CoverageLink[]>();
  for (const l of links) {
    const k =
      l.lastStatus && STATUS_GROUP_META[l.lastStatus] ? l.lastStatus : "other";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(l);
  }
  const orderedGroups = STATUS_GROUP_ORDER.filter((g) => grouped.has(g));
  return (
    <div className="bg-slate-50/50">
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--card-border)] px-6 py-2.5">
        {orderedGroups.map((g) => {
          const meta = STATUS_GROUP_META[g];
          return (
            <span
              key={g}
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dotCls}`}
              />
              {meta.label} {grouped.get(g)!.length}
            </span>
          );
        })}
      </div>
      {orderedGroups.map((g) => {
        const meta = STATUS_GROUP_META[g];
        const items = grouped.get(g)!;
        return (
          <div key={g}>
            <div className="flex items-center gap-2 bg-white/60 px-6 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dotCls}`}
              />
              {meta.label}
              <span className="text-slate-500">({items.length})</span>
            </div>
            <div className="divide-y divide-[var(--card-border)]">
              {items.map((l) => {
                const srcBadge =
                  l.linkSource === "tag"
                    ? {
                        text: "태그",
                        cls: "bg-teal-100 text-teal-700 border-teal-200",
                      }
                    : l.linkSource === "heuristic"
                      ? {
                          text: "추정",
                          cls: "bg-indigo-100 text-indigo-700 border-indigo-200",
                        }
                      : l.linkSource === "manual"
                        ? {
                            text: "수동",
                            cls: "bg-sky-100 text-sky-700 border-sky-200",
                          }
                        : {
                            text: "실측",
                            cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
                          };
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-4 px-6 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${srcBadge.cls}`}
                        >
                          {srcBadge.text}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-slate-800">
                            {l.testTitle}
                          </div>
                          {l.testFile && (
                            <div className="font-mono text-[10px] text-[var(--muted)]">
                              {l.testFile}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {l.lastRunAt && l.linkSource === "real" && (
                      <div className="shrink-0 text-[10px] text-[var(--muted)]">
                        {new Date(l.lastRunAt).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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
        (r) =>
          r.product === product &&
          (r.category ?? "기타") === category &&
          (filterStatus === "all" || r.coverageStatus === filterStatus),
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [rows, product, category, filterStatus]);

  const summary = useMemo(() => {
    const all = rows.filter(
      (r) => r.product === product && (r.category ?? "기타") === category,
    );
    const total = all.length;
    const covered = all.filter((r) => r.coverageStatus === "covered").length;
    const partial = all.filter((r) => r.coverageStatus === "partial").length;
    const pct = total
      ? Math.round(((covered + partial * 0.5) / total) * 100)
      : 0;
    return { total, covered, partial, pct };
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
      {/* Breadcrumb + Back */}
      <div className="flex items-center gap-2 text-sm">
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

      {/* Category header */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              카테고리
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {category}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">
              {summary.pct}%
            </div>
            <div className="text-xs text-[var(--muted)]">
              {summary.covered}/{summary.total} 검증
              {summary.partial > 0 && ` · 부분 ${summary.partial}`}
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${summary.pct}%` }}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="w-40">
          <StyledSelect
            aria-label="상태 필터"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">전체 상태</option>
            <option value="covered">자동화(검증)</option>
            <option value="partial">부분</option>
            <option value="heuristic_only">추정</option>
            <option value="manual_only">수동만</option>
            <option value="none">미커버</option>
          </StyledSelect>
        </div>
        <div className="ml-auto text-sm text-[var(--muted)]">
          {scoped.length} 항목
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="w-8 px-4 py-2"></th>
              <th className="px-4 py-2">페이지</th>
              <th className="px-4 py-2">기능</th>
              <th className="px-4 py-2">우선순위</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2">테스트</th>
              <th className="px-4 py-2">최근 실행</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {scoped.map((r) => {
              const isExpanded = expandedRows.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr
                    className={`cursor-pointer hover:bg-[var(--card-hover)] ${
                      isExpanded ? "bg-slate-50" : ""
                    }`}
                    onClick={() => toggleRow(r.id)}
                  >
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {r.linkCount > 0 && (
                        <svg
                          aria-hidden="true"
                          className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
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
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-mono text-xs text-slate-700">
                        {r.pagePath}
                      </div>
                      {r.pageTitle && (
                        <div className="text-xs text-[var(--muted)]">
                          {r.pageTitle}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-900">
                      {r.featureName}
                    </td>
                    <td className="px-4 py-2">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-4 py-2">
                      <Badge status={r.coverageStatus} />
                    </td>
                    <td className="px-4 py-2">
                      <TestRatioBar links={r.links} />
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--muted)]">
                      {r.lastRunAt
                        ? new Date(r.lastRunAt).toLocaleDateString("ko-KR")
                        : "—"}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={7}
                        className="border-t border-dashed border-[var(--card-border)] p-0"
                      >
                        <TestLinksList links={r.links} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
