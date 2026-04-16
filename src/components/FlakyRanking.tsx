"use client";

import { useState, useEffect, useCallback } from "react";

type FlakyResult = {
  status: string;
  runId: number;
  createdAt: string;
};

type FlakyRankingItem = {
  title: string;
  flakyCount: number;
  totalRuns: number;
  flakyRate: number;
  last10Results: FlakyResult[];
};

const DAYS_OPTIONS = [
  { value: 7, label: "7일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
] as const;

const STATUS_DOTS: Record<string, { color: string; label: string }> = {
  passed: { color: "bg-emerald-400", label: "passed" },
  failed: { color: "bg-rose-400", label: "failed" },
  flaky: { color: "bg-amber-400", label: "flaky" },
  skipped: { color: "bg-slate-500", label: "skipped" },
};

export function FlakyRanking({
  suite,
  environment,
}: {
  suite: string;
  environment: string;
}) {
  const [rankings, setRankings] = useState<FlakyRankingItem[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("days", String(days));
      params.set("limit", "5");
      if (suite) params.set("suite", suite);
      if (environment) params.set("environment", environment);

      const res = await fetch(`/api/flaky-ranking?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRankings(data.rankings);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [days, suite, environment]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Flaky 테스트 랭킹
        </h2>
        <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                days === opt.value
                  ? "bg-amber-50 text-amber-700 font-semibold"
                  : "text-[var(--muted)] hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        {loading && rankings.length === 0 ? (
          <div
            className="divide-y divide-[var(--card-border)]"
            aria-busy="true"
            aria-label="랭킹 로딩 중"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3.5 py-3 sm:gap-4 sm:px-4"
              >
                <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : rankings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg
              aria-hidden="true"
              className="mx-auto mb-3 h-10 w-10 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p className="text-sm text-[var(--muted)]">
              최근 {days}일간 flaky 테스트가 없습니다.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {rankings.map((item, idx) => (
              <div
                key={item.title}
                className="flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50 transition-colors sm:gap-4 sm:px-4"
              >
                {/* 순위 */}
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    idx === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : idx === 1
                        ? "bg-slate-100 text-slate-500"
                        : idx === 2
                          ? "bg-amber-100 text-amber-700"
                          : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {idx + 1}
                </span>

                {/* 테스트명 */}
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium text-slate-700 line-clamp-2 sm:truncate"
                    title={item.title}
                  >
                    {item.title}
                  </p>
                </div>

                {/* Flaky 비율 + 횟수 */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-1 w-10 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${item.flakyRate}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs font-semibold text-amber-700">
                      {item.flakyRate}%
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                    {item.flakyCount}/{item.totalRuns}
                  </p>
                </div>

                {/* 최근 10회 결과 도트 */}
                <div className="hidden shrink-0 items-center gap-1 sm:flex">
                  {item.last10Results
                    .slice()
                    .reverse()
                    .map((r, i) => {
                      const dot = STATUS_DOTS[r.status] || STATUS_DOTS.skipped;
                      return (
                        <span
                          key={i}
                          title={`Run #${r.runId}: ${dot.label}`}
                          className={`inline-block h-3 w-3 rounded-full ${dot.color}`}
                        />
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
