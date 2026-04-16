"use client";

import { useState, useEffect, useCallback } from "react";
import { SummaryCards } from "./SummaryCards";
import { TrendCharts } from "./TrendCharts";
import { FlakyRanking } from "./FlakyRanking";
import { RunsTable } from "./RunsTable";
import type { TestRun } from "@/db/schema";

const PAGE_SIZE = 10;

const SUITES = [
  { value: "", label: "전체" },
  { value: "cmr", label: "CMR" },
  { value: "albumbuddy", label: "AlbumBuddy" },
  { value: "admin", label: "Admin" },
] as const;

const ENVIRONMENTS = [
  { value: "", label: "전체" },
  { value: "prod", label: "Prod" },
  { value: "stg", label: "STG" },
] as const;

export function DashboardContent({
  initialRuns,
  initialTotal,
}: {
  initialRuns: TestRun[];
  initialTotal: number;
}) {
  const [runs, setRuns] = useState<TestRun[]>(initialRuns);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [suite, setSuite] = useState("");
  const [environment, setEnvironment] = useState("");
  const [latestRun, setLatestRun] = useState<TestRun | null>(
    initialRuns[0] || null,
  );
  const hasRunning =
    latestRun?.status === "running" || runs.some((r) => r.status === "running");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchRuns = useCallback(
    async (p: number) => {
      try {
        const url = new URL("/api/runs", window.location.origin);
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("offset", String(p * PAGE_SIZE));
        if (suite) url.searchParams.set("suite", suite);
        if (environment) url.searchParams.set("environment", environment);
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        setRuns(data.runs);
        setTotal(data.total);
        // 첫 페이지 조회 시 latestRun 갱신
        if (p === 0 && data.runs.length > 0) {
          setLatestRun(data.runs[0]);
        }
      } catch {
        // ignore
      }
    },
    [suite, environment],
  );

  // 최신 run은 페이지와 무관하게 항상 갱신
  const fetchLatestRun = useCallback(async () => {
    try {
      const url = new URL("/api/runs", window.location.origin);
      url.searchParams.set("limit", "1");
      url.searchParams.set("offset", "0");
      if (suite) url.searchParams.set("suite", suite);
      if (environment) url.searchParams.set("environment", environment);
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.runs.length > 0) setLatestRun(data.runs[0]);
    } catch {
      // ignore
    }
  }, [suite, environment]);

  // suite/environment 변경 시 page 리셋 및 데이터 재조회
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 필터 변경으로 인한 page 리셋과 fetch를 effect에서 일괄 처리
    setPage(0);
    fetchRuns(0);
  }, [suite, environment]); // eslint-disable-line react-hooks/exhaustive-deps

  // 페이지 변경 시 데이터 fetch
  useEffect(() => {
    if (page === 0) return; // 첫 페이지는 suite 변경 effect에서 처리
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 API와의 동기화 (data fetching 패턴)
    fetchRuns(page);
  }, [page, fetchRuns]);

  // running 상태: 5초 빠른 폴링, 아닐 때: 30초 느린 폴링 (새 run 감지)
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchRuns(page);
        if (page !== 0) fetchLatestRun();
      },
      hasRunning ? 5000 : 30000,
    );
    return () => clearInterval(interval);
  }, [hasRunning, page, fetchRuns, fetchLatestRun]);

  // 페이지 복귀(탭 전환, 네비게이션 복귀) 시 데이터 갱신
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchRuns(page);
        if (page !== 0) fetchLatestRun();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [page, fetchRuns, fetchLatestRun]);

  function goToPage(p: number) {
    if (p < 0 || p >= totalPages) return;
    setPage(p);
    if (p === 0) {
      fetchRuns(0);
    } else {
      fetchRuns(p);
      fetchLatestRun();
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)] tracking-tight">
        대시보드
      </h1>

      {/* Suite + Environment 필터 */}
      <div className="mb-8 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-4">
        <div className="flex items-center gap-3 gap-y-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--muted)]">Suite</span>
          <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
            {SUITES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setSuite(s.value);
                  if (s.value !== "cmr") setEnvironment("");
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  suite === s.value
                    ? "bg-slate-100 text-slate-800 font-semibold"
                    : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-medium text-[var(--muted)]">Env</span>
          <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
            {ENVIRONMENTS.map((e) => (
              <button
                key={e.value}
                onClick={() => setEnvironment(e.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  environment === e.value
                    ? "bg-slate-100 text-slate-800 font-semibold"
                    : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>

          {hasRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              실행 중
            </span>
          )}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
          최근 실행 요약
        </h2>
        <SummaryCards latestRun={latestRun} />
      </section>

      <div className="border-t border-[var(--card-border)] pt-8 mt-2">
        <TrendCharts suite={suite} environment={environment} />
      </div>

      <div className="border-t border-[var(--card-border)] pt-8 mt-2">
        <FlakyRanking suite={suite} environment={environment} />
      </div>

      <section className="border-t border-[var(--card-border)] pt-8 mt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            실행 히스토리
          </h2>
          <span className="text-xs text-[var(--muted)]">총 {total}건</span>
        </div>
        <RunsTable runs={runs} />

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
            >
              이전
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(
                (i) =>
                  i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1,
              )
              .reduce<(number | "...")[]>((acc, i, idx, arr) => {
                if (idx > 0 && i - (arr[idx - 1] as number) > 1) {
                  acc.push("...");
                }
                acc.push(i);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-xs text-[var(--muted)]"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(item as number)}
                    className={`min-w-[32px] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      page === item
                        ? "bg-slate-100 text-slate-800 font-semibold border border-slate-300"
                        : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {(item as number) + 1}
                  </button>
                ),
              )}

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
            >
              다음
            </button>
          </div>
        )}
      </section>
    </>
  );
}
