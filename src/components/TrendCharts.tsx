"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  date: string;
  passRate: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  total: number;
  avgDurationMs: number;
  runCount: number;
}

const PERIODS = [
  { value: 7, label: "7일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
] as const;

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function msToMin(ms: number) {
  return Math.round((ms / 60000 + Number.EPSILON) * 10) / 10;
}

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
  formatter?: (name: string, value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-[var(--muted)]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {formatter ? formatter(p.name, p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function Skeleton() {
  return <div className="h-[220px] animate-pulse rounded-lg bg-white/5" />;
}

function ChartCard({
  title,
  children,
  fullWidth,
}: {
  title: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 ${
        fullWidth ? "md:col-span-2" : ""
      }`}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function TrendCharts({
  suite,
  environment,
}: {
  suite: string;
  environment: string;
}) {
  const [days, setDays] = useState<number>(30);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (suite) params.set("suite", suite);
      if (environment) params.set("environment", environment);
      const res = await fetch(`/api/trends?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setPoints(data.points);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [suite, days, environment]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const hasData = points.length >= 1;

  // 실행 시간을 분 단위로 변환한 데이터
  const chartData = points.map((p) => ({
    ...p,
    avgDurationMin: msToMin(p.avgDurationMs),
  }));

  const axisStyle = {
    fontSize: 11,
    fill: "var(--muted)",
  };

  const gridStroke = "var(--card-border)";

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          트렌드
        </h2>
        <div className="flex gap-2">
          {/* 기간 필터 */}
          <div className="flex rounded-lg border border-[var(--card-border)] overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  days === p.value
                    ? "bg-indigo-500/15 text-indigo-400"
                    : "text-[var(--muted)] hover:text-white hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton />
          <Skeleton />
          <div className="md:col-span-2">
            <Skeleton />
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex h-[200px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
          <p className="text-sm text-[var(--muted)]">
            충분한 데이터가 쌓이면 트렌드가 표시됩니다
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 성공률 추이 */}
          <ChartCard title="성공률 추이">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  tick={axisStyle}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                  width={40}
                />
                <ReferenceLine
                  y={90}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: "90%",
                    position: "right",
                    fill: "#f59e0b",
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(_n, v) => `${v}%`} />}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  name="성공률"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#34d399" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 실행 시간 추이 */}
          <ChartCard title="실행 시간 추이">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="durationGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop
                      offset="100%"
                      stopColor="#818cf8"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  tick={axisStyle}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}m`}
                  width={40}
                />
                <Tooltip
                  content={<CustomTooltip formatter={(_n, v) => `${v}분`} />}
                />
                <Area
                  type="monotone"
                  dataKey="avgDurationMin"
                  name="평균 실행 시간"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="url(#durationGradient)"
                  dot={{ r: 3, fill: "#818cf8" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 일별 실패/Flaky 추이 */}
          <ChartCard title="일별 실패 · Flaky 추이" fullWidth>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  tick={axisStyle}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="failed"
                  name="Failed"
                  stackId="issues"
                  fill="#fb7185"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="flaky"
                  name="Flaky"
                  stackId="issues"
                  fill="#fbbf24"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </section>
  );
}
