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
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-[var(--muted)] hover:text-white hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] transition-opacity ${loading ? "opacity-50" : ""}`}
      >
        {rankings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--muted)]">
              {loading
                ? "로딩 중..."
                : `최근 ${days}일간 flaky 테스트가 없습니다.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {rankings.map((item, idx) => (
              <div
                key={item.title}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.04] transition-colors"
              >
                {/* 순위 */}
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    idx === 0
                      ? "bg-yellow-500/15 text-yellow-400"
                      : idx === 1
                        ? "bg-slate-300/15 text-slate-300"
                        : idx === 2
                          ? "bg-amber-700/15 text-amber-600"
                          : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {idx + 1}
                </span>

                {/* 테스트명 */}
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-medium text-slate-200"
                    title={item.title}
                  >
                    {item.title}
                  </p>
                </div>

                {/* Flaky 횟수/비율 */}
                <div className="shrink-0 text-right">
                  <span className="text-sm font-mono font-semibold text-amber-400">
                    {item.flakyCount}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    /{item.totalRuns}
                  </span>
                  <div className="ml-2 flex items-center gap-1.5">
                    <div className="h-1 w-10 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${item.flakyRate}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--muted)]">
                      {item.flakyRate}%
                    </span>
                  </div>
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
