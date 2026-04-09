"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { TestRun, TestCase } from "@/db/schema";
import { AppHeader } from "./AppHeader";
import { StatusBadge } from "./StatusBadge";
import { TestCasesList } from "./TestCasesList";
import {
  formatDuration,
  formatDate,
  getPassRate,
  getPassRateNumber,
} from "@/lib/format";
import {
  ERROR_CATEGORY_DISPLAY,
  type ErrorCategory,
} from "@/lib/error-classifier";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type StatusFilter = "all" | "failed" | "flaky" | "passed" | "skipped";
type SortOption = "default" | "duration_desc" | "duration_asc" | "title_asc";
type CategoryFilter = "" | ErrorCategory;

interface RunDetailProps {
  run: TestRun;
  initialCases: TestCase[];
}

export function RunDetail({ run, initialCases }: RunDetailProps) {
  const [cases, setCases] = useState(initialCases);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("default");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(false);

  const fetchCases = useCallback(
    async (
      status: StatusFilter,
      searchText: string,
      sortBy: SortOption,
      cat: CategoryFilter = "",
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);
        if (searchText) params.set("search", searchText);
        if (sortBy !== "default") params.set("sort", sortBy);
        if (cat) params.set("category", cat);

        const res = await fetch(`/api/runs/${run.runId}/tests?${params}`);
        if (res.ok) {
          setCases(await res.json());
        }
      } finally {
        setLoading(false);
      }
    },
    [run.runId],
  );

  // status/sort/category 변경 시 즉시 fetch (초기 마운트 건너뛰기)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    fetchCases(statusFilter, search, sort, categoryFilter);
    // search는 debounce에서 처리하므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sort, categoryFilter, fetchCases]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCases(statusFilter, value, sort, categoryFilter);
    }, 300);
  };

  const statusCounts = {
    all: initialCases.length,
    failed: initialCases.filter((c) => c.status === "failed").length,
    flaky: initialCases.filter((c) => c.status === "flaky").length,
    passed: initialCases.filter((c) => c.status === "passed").length,
    skipped: initialCases.filter((c) => c.status === "skipped").length,
  };

  const passRate = getPassRateNumber(run.passed, run.total);

  // 실패/flaky 테스트의 카테고리 분포 계산
  const failedOrFlaky = initialCases.filter(
    (c) => c.status === "failed" || c.status === "flaky",
  );
  const categoryCounts = failedOrFlaky.reduce<Record<string, number>>(
    (acc, c) => {
      const cat = c.errorCategory || "unknown";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    {},
  );

  const PIE_COLORS: Record<string, string> = {
    network_timeout: "#fb923c",
    selector_not_found: "#a78bfa",
    assertion_failure: "#60a5fa",
    environment_issue: "#f87171",
    unknown: "#94a3b8",
  };

  const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name: ERROR_CATEGORY_DISPLAY[name as ErrorCategory]?.label || name,
    value,
    key: name,
    color: PIE_COLORS[name] || "#94a3b8",
  }));

  const statusTabs: { key: StatusFilter; label: string; color: string }[] = [
    { key: "all", label: "전체", color: "text-[var(--foreground)]" },
    { key: "failed", label: "Failed", color: "text-rose-600" },
    { key: "flaky", label: "Flaky", color: "text-amber-600" },
    { key: "passed", label: "Passed", color: "text-emerald-600" },
    { key: "skipped", label: "Skipped", color: "text-slate-500" },
  ];

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: "default", label: "상태순" },
    { key: "duration_desc", label: "시간 ↓" },
    { key: "duration_asc", label: "시간 ↑" },
    { key: "title_asc", label: "이름순" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-slate-600 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            대시보드로 돌아가기
          </Link>
        </div>

        {/* Run 요약 카드 */}
        <div className="mb-8 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          <div className="border-b border-[var(--card-border)] px-6 py-5">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Run #{run.runId}
              </h2>
              <StatusBadge status={run.status} />
              <span className="rounded-md border border-[var(--card-border)] bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-600">
                {run.suite}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[var(--card-border)] md:grid-cols-4">
            <StatCell
              label="성공률"
              value={getPassRate(run.passed, run.total)}
              color={
                passRate >= 90
                  ? "text-emerald-600"
                  : passRate >= 70
                    ? "text-amber-600"
                    : "text-rose-600"
              }
            />
            <StatCell
              label="통과 / 전체"
              value={`${run.passed} / ${run.total}`}
              color="text-slate-700"
              mono
            />
            <StatCell
              label="소요 시간"
              value={formatDuration(run.durationMs)}
              color="text-slate-700"
            />
            <StatCell
              label="실행 일시"
              value={formatDate(run.createdAt)}
              color="text-slate-700"
              small
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-[var(--card-border)] px-6 py-3.5">
            {run.branch && <MetaTag icon="branch" value={run.branch} />}
            {run.commitSha && (
              <MetaTag icon="commit" value={run.commitSha.slice(0, 7)} />
            )}
            <MetaTag icon="trigger" value={run.triggeredBy} />
            {run.flaky > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                Flaky: {run.flaky}
              </span>
            )}
            {run.skipped > 0 && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                Skipped: {run.skipped}
              </span>
            )}
          </div>
        </div>

        {/* 필터/검색/정렬 바 */}
        <div className="mb-6 space-y-4">
          {/* Status 탭 */}
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === tab.key
                    ? `${tab.color} bg-slate-100`
                    : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold">
                  {statusCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* 카테고리 필터 (실패/flaky가 있을 때만) */}
          {failedOrFlaky.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryFilter("")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  categoryFilter === ""
                    ? "text-[var(--foreground)] bg-slate-100"
                    : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                전체 카테고리
              </button>
              {(Object.keys(ERROR_CATEGORY_DISPLAY) as ErrorCategory[]).map(
                (cat) => {
                  const count = categoryCounts[cat] || 0;
                  if (count === 0) return null;
                  const display = ERROR_CATEGORY_DISPLAY[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() =>
                        setCategoryFilter(categoryFilter === cat ? "" : cat)
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        categoryFilter === cat
                          ? `${display.color} bg-slate-100`
                          : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {display.label}
                      <span className="ml-1.5 rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold">
                        {count}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}

          {/* 검색 + 정렬 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <svg
                className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="테스트 이름 검색..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-[var(--muted)] focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-0.5">
              {sortOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    sort === opt.key
                      ? "bg-slate-100 text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 실패 분류 분포 */}
        {pieData.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
              실패 분류 분포
            </h3>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {pieData.map((entry) => (
                  <div
                    key={entry.key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-600">{entry.name}</span>
                    <span className="font-mono text-slate-500">
                      {entry.value}건
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 테스트 목록 */}
        <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
          {cases.length === 0 ? (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-12 text-center">
              <p className="text-sm text-[var(--muted)]">
                {search ? "검색 결과가 없습니다." : "테스트 케이스가 없습니다."}
              </p>
            </div>
          ) : (
            <TestCasesList cases={cases} showError />
          )}
        </div>
      </main>
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
  mono,
  small,
}: {
  label: string;
  value: string;
  color: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="bg-[var(--card)] px-6 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-1">
        {label}
      </p>
      <p
        className={`font-bold ${color} ${mono ? "font-mono" : ""} ${small ? "text-base" : "text-lg"}`}
      >
        {value}
      </p>
    </div>
  );
}

function MetaTag({ icon, value }: { icon: string; value: string }) {
  const icons: Record<string, React.ReactNode> = {
    branch: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.03a4.5 4.5 0 00-6.364-6.364L4.5 8.737"
        />
      </svg>
    ),
    commit: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
        />
      </svg>
    ),
    trigger: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
        />
      </svg>
    ),
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
      {icons[icon]}
      <code className="font-mono text-slate-500">{value}</code>
    </span>
  );
}
