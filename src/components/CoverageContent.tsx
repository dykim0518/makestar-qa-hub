"use client";

import { Fragment, useMemo, useState } from "react";
import type { CoverageFeatureRow, CoverageLink } from "@/app/coverage/page";

type Props = {
  rows: CoverageFeatureRow[];
};

const PRODUCT_LABEL: Record<string, string> = {
  cmr: "커머스",
  admin: "어드민",
  albumbuddy: "AlbumBuddy",
  admin_makestar: "통합매니저_메이크스타",
  admin_pocaalbum: "통합매니저_포카앨범",
  admin_albumbuddy: "통합매니저_앨범버디",
};

const PRODUCT_ORDER = [
  "admin_makestar",
  "admin_pocaalbum",
  "admin_albumbuddy",
  "cmr",
  "admin",
  "albumbuddy",
];

function productRank(product: string): number {
  const i = PRODUCT_ORDER.indexOf(product);
  return i === -1 ? PRODUCT_ORDER.length : i;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  covered: {
    label: "자동화됨",
    cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  partial: {
    label: "부분",
    cls: "bg-amber-100 text-amber-800 border-amber-200",
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

function LinkStatusDot({ status }: { status: string | null }) {
  const color =
    status === "passed"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-rose-500"
        : status === "flaky"
          ? "bg-amber-500"
          : status === "heuristic"
            ? "bg-indigo-400"
            : "bg-slate-300";
  const label = status === "heuristic" ? "휴리스틱" : (status ?? "-");
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function TestLinksList({ links }: { links: CoverageLink[] }) {
  if (links.length === 0) {
    return (
      <div className="px-6 py-3 text-xs text-[var(--muted)]">
        연결된 테스트 없음
      </div>
    );
  }
  return (
    <div className="divide-y divide-[var(--card-border)] bg-slate-50/50">
      {links.map((l) => (
        <div
          key={l.id}
          className="flex items-center justify-between gap-4 px-6 py-2"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-slate-800">{l.testTitle}</div>
            {l.testFile && (
              <div className="font-mono text-[10px] text-[var(--muted)]">
                {l.testFile}
              </div>
            )}
          </div>
          <div className="shrink-0">
            <LinkStatusDot status={l.lastStatus} />
          </div>
        </div>
      ))}
    </div>
  );
}

type CategoryGroup = {
  key: string;
  product: string;
  category: string;
  rows: CoverageFeatureRow[];
  total: number;
  covered: number;
  partial: number;
  pct: number;
};

export function CoverageContent({ rows }: Props) {
  const [filterProduct, setFilterProduct] = useState<string>("admin_makestar");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const products = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.product))).sort(
        (a, b) => productRank(a) - productRank(b),
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter(
      (r) =>
        r.product === filterProduct &&
        (filterStatus === "all" || r.coverageStatus === filterStatus),
    );
  }, [rows, filterProduct, filterStatus]);

  const groups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, CategoryGroup>();
    for (const r of filtered) {
      const category = r.category ?? "기타";
      const key = `${r.product}::${category}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          product: r.product,
          category,
          rows: [],
          total: 0,
          covered: 0,
          partial: 0,
          pct: 0,
        });
      }
      const g = map.get(key)!;
      g.rows.push(r);
      g.total += 1;
      if (r.coverageStatus === "covered") g.covered += 1;
      else if (r.coverageStatus === "partial") g.partial += 1;
    }
    for (const g of map.values()) {
      g.pct = g.total
        ? Math.round(((g.covered + g.partial * 0.5) / g.total) * 100)
        : 0;
    }
    return Array.from(map.values()).sort((a, b) => {
      const pr = productRank(a.product) - productRank(b.product);
      if (pr !== 0) return pr;
      return a.category.localeCompare(b.category);
    });
  }, [filtered]);

  const summary = useMemo(() => {
    const byProduct = new Map<
      string,
      { total: number; covered: number; partial: number; none: number }
    >();
    for (const r of rows) {
      const s = byProduct.get(r.product) ?? {
        total: 0,
        covered: 0,
        partial: 0,
        none: 0,
      };
      s.total += 1;
      if (r.coverageStatus === "covered") s.covered += 1;
      else if (r.coverageStatus === "partial") s.partial += 1;
      else s.none += 1;
      byProduct.set(r.product, s);
    }
    return byProduct;
  }, [rows]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          등록된 기능이 없습니다
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          크롤러 결과(<code>coverage-crawl-*.json</code>)를 seed로 등록하거나
          수동으로 기능을 추가하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(() => {
        let total = 0;
        let covered = 0;
        let partial = 0;
        for (const s of summary.values()) {
          total += s.total;
          covered += s.covered;
          partial += s.partial;
        }
        const overallPct = total
          ? Math.round(((covered + partial * 0.5) / total) * 100)
          : 0;
        const productSummary = Array.from(summary.entries())
          .sort(([a], [b]) => productRank(a) - productRank(b))
          .map(([product, s]) => {
            const pct = s.total
              ? Math.round(((s.covered + s.partial * 0.5) / s.total) * 100)
              : 0;
            const label = (PRODUCT_LABEL[product] ?? product).replace(
              /^통합매니저_/,
              "",
            );
            return `${label} ${pct}%`;
          })
          .join(" · ");
        return (
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              자동화 커버리지
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {total}개 기능 중 {covered}개 자동화 ({overallPct}%) ·{" "}
              {productSummary}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from(summary.entries())
          .sort(([a], [b]) => productRank(a) - productRank(b))
          .map(([product, s]) => {
            const pct = s.total
              ? Math.round(((s.covered + s.partial * 0.5) / s.total) * 100)
              : 0;
            return (
              <div
                key={product}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5"
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-semibold text-slate-600">
                    {PRODUCT_LABEL[product] ?? product}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {pct}%
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-3 flex gap-3 text-xs text-[var(--muted)]">
                  <span>총 {s.total}</span>
                  <span className="text-emerald-700">자동화 {s.covered}</span>
                  <span className="text-amber-700">부분 {s.partial}</span>
                  <span>미커버 {s.none}</span>
                </div>
              </div>
            );
          })}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
        >
          {products.map((p) => (
            <option key={p} value={p}>
              {PRODUCT_LABEL[p] ?? p}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="covered">자동화됨</option>
          <option value="partial">부분</option>
          <option value="manual_only">수동만</option>
          <option value="none">미커버</option>
        </select>
        <button
          type="button"
          onClick={() =>
            setCollapsedGroups(
              collapsedGroups.size === groups.length
                ? new Set()
                : new Set(groups.map((g) => g.key)),
            )
          }
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
        >
          {collapsedGroups.size === groups.length ? "모두 펴기" : "모두 접기"}
        </button>
        <div className="ml-auto text-sm text-[var(--muted)]">
          {filtered.length} / {rows.length} 항목 · {groups.length} 카테고리
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((g) => {
          const isCollapsed = collapsedGroups.has(g.key);
          return (
            <div
              key={g.key}
              className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
            >
              <button
                type="button"
                onClick={() => toggleGroup(g.key)}
                className="flex w-full items-center justify-between gap-4 bg-slate-50 px-5 py-3 text-left hover:bg-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {PRODUCT_LABEL[g.product] ?? g.product}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {g.category}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                  <span className="text-emerald-700 font-medium">
                    {g.covered}/{g.total}
                  </span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-semibold text-slate-700">
                    {g.pct}%
                  </span>
                </div>
              </button>

              {!isCollapsed && (
                <table className="w-full text-sm">
                  <thead className="bg-white text-left text-xs font-semibold uppercase text-slate-500">
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
                    {g.rows.map((r) => {
                      const isExpanded = expandedRows.has(r.id);
                      return (
                        <Fragment key={r.id}>
                          <tr
                            className={`cursor-pointer hover:bg-[var(--card-hover)] ${
                              isExpanded ? "bg-slate-50" : ""
                            }`}
                            onClick={() => toggleRow(r.id)}
                          >
                            <td className="px-4 py-2 text-xs text-slate-400">
                              {r.linkCount > 0 ? (isExpanded ? "▼" : "▶") : ""}
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
                            <td className="px-4 py-2 text-xs uppercase text-slate-500">
                              {r.priority}
                            </td>
                            <td className="px-4 py-2">
                              <Badge status={r.coverageStatus} />
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-600">
                              {r.linkCount > 0 ? `${r.linkCount}건` : "—"}
                            </td>
                            <td className="px-4 py-2 text-xs text-[var(--muted)]">
                              {r.lastRunAt
                                ? new Date(r.lastRunAt).toLocaleDateString(
                                    "ko-KR",
                                  )
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
