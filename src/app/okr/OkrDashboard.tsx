"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatPercent,
  formatPercentPoint,
  type EnrichedMetric,
  type KrStatus,
  type SignalLevel,
  type TrendDirection,
} from "@/lib/okr-calculations";
import { OKR_2026_H1, type KrMetric } from "@/lib/okr-config";

const SIGNAL_TONE: Record<
  SignalLevel,
  { bg: string; text: string; border: string; label: string }
> = {
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "달성 중",
  },
  yellow: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "임계치 근접",
  },
  red: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    label: "미달",
  },
};

const KR_STROKE: Record<KrMetric, string> = {
  defectRate: "#475569",
  defectRemovalRate: "#475569",
  testEffectiveness: "#475569",
};

const TARGET_HIT = "#059669";
const TARGET_MISS = "#e11d48";

function shortPeriod(periodStart: string): string {
  const [, month, day] = periodStart.split("-");
  return `${Number(month)}/${day}`;
}

function periodPhrase(now: Date): string {
  const start = new Date(OKR_2026_H1.period.start);
  const end = new Date(OKR_2026_H1.period.end);
  if (now < start) return `시작 전 (평가: ${OKR_2026_H1.period.end})`;
  if (now > end) return `평가 완료 (${OKR_2026_H1.period.end})`;
  const m = now.getMonth() + 1;
  return `1~${m}월 진행 중 (평가: ${OKR_2026_H1.period.end})`;
}

function trendArrow(trend: TrendDirection | null): {
  glyph: string;
  className: string;
  label: string;
} {
  if (trend === "improving")
    return { glyph: "↑", className: "text-emerald-600", label: "개선" };
  if (trend === "worsening")
    return { glyph: "↓", className: "text-rose-600", label: "악화" };
  if (trend === "flat")
    return { glyph: "→", className: "text-[var(--muted)]", label: "유지" };
  return { glyph: "—", className: "text-[var(--muted)]", label: "데이터 부족" };
}

function gapMessage(targetValue: number | null, gap: number | null): string {
  if (gap === null) return "데이터 부족";
  if (gap >= 0)
    return `목표 ${formatPercent(targetValue)}보다 ${formatPercentPoint(gap)} 여유`;
  return `목표까지 ${formatPercentPoint(gap)} 부족`;
}

function metricLabel(metric: KrMetric): string {
  if (metric === "defectRate") return "결함률";
  if (metric === "defectRemovalRate") return "결함 제거율";
  return "테스트 효과성";
}

export function OkrDashboard({
  metrics,
  krStatuses,
}: {
  metrics: EnrichedMetric[];
  krStatuses: KrStatus[];
}) {
  if (metrics.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          아직 입력된 릴리스가 없습니다
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          관리자 페이지(<code className="font-mono">/admin/metrics</code>)에서
          첫 릴리스를 입력하면 KR 진행률이 계산됩니다.
        </p>
      </div>
    );
  }

  const phrase = periodPhrase(new Date());

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        {krStatuses.map((status) => (
          <KrCard key={status.kr.id} status={status} periodPhrase={phrase} />
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          KR 추세
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {krStatuses.map((status) => (
            <TrendCard key={status.kr.id} status={status} metrics={metrics} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          릴리스 ({metrics.length})
        </h2>
        <ReleaseTable metrics={metrics} />
      </section>
    </div>
  );
}

function KrCard({
  status,
  periodPhrase,
}: {
  status: KrStatus;
  periodPhrase: string;
}) {
  const tone = SIGNAL_TONE[status.signal];
  const kr = status.kr;
  const agg = status.aggregation;
  const arrow = trendArrow(agg.trend);

  return (
    <article className="flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:border-[var(--accent)]/30 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            {kr.id.toUpperCase()} · {metricLabel(kr.metric)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {kr.name}
          </h3>
        </div>
        <span
          className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.bg} ${tone.text} ${tone.border}`}
        >
          {tone.label}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          기간 평균 ({agg.count} 릴리스)
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
            {formatPercent(agg.average)}
          </p>
          <span
            className={`text-xl font-semibold ${arrow.className}`}
            aria-label={`최근 ${arrow.label}`}
            title={`최근 1건이 직전 평균 대비 ${arrow.label}`}
          >
            {arrow.glyph}
          </span>
        </div>
      </div>

      <BaselineTargetBar status={status} />

      <p className="mt-3 text-xs text-[var(--muted)]">
        {gapMessage(status.targetValue, status.gap)}
      </p>

      <p className="mt-3 text-xs text-[var(--muted)]">
        범위 {formatPercent(agg.min)} ~ {formatPercent(agg.max)} · 최근{" "}
        {formatPercent(agg.latest)}
      </p>

      <p className="mt-4 border-t border-[var(--card-border)] pt-3 text-xs text-[var(--muted)]">
        {periodPhrase}
      </p>
    </article>
  );
}

function BaselineTargetBar({ status }: { status: KrStatus }) {
  const kr = status.kr;
  const baseline = status.baseline;
  const target = status.targetValue;
  const average = status.aggregation.average;
  if (baseline === null || target === null || average === null) return null;

  const lo = Math.min(baseline, target, average);
  const hi = Math.max(baseline, target, average);
  const span = hi - lo;
  const padding = span > 0 ? span * 0.15 : 0.05;
  const min = Math.max(0, lo - padding);
  const max = Math.min(1, hi + padding);
  const range = max - min || 1;

  const pct = (v: number) => ((v - min) / range) * 100;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
        <span>Baseline {formatPercent(baseline)}</span>
        <span>Target {formatPercent(target)}</span>
      </div>
      <div className="relative mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <span
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-400"
          style={{ left: `${pct(baseline)}%` }}
          aria-hidden
        />
        <span
          className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-700"
          style={{ left: `${pct(target)}%` }}
          aria-hidden
        />
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
            status.signal === "green"
              ? "bg-emerald-500"
              : status.signal === "yellow"
                ? "bg-amber-500"
                : "bg-rose-500"
          }`}
          style={{ left: `${pct(average)}%` }}
          aria-label={`평균 ${formatPercent(average)}`}
          title={`평균 ${formatPercent(average)}`}
        />
      </div>
      <p className="mt-1 text-[10px] text-[var(--muted)]">
        {kr.direction === "lower" ? "← 좋음" : "좋음 →"}
      </p>
    </div>
  );
}

function TrendCard({
  status,
  metrics,
}: {
  status: KrStatus;
  metrics: EnrichedMetric[];
}) {
  const kr = status.kr;
  const target = status.targetValue;
  const baseline = status.baseline;
  const stroke = KR_STROKE[kr.metric];

  const data = metrics.map((m) => {
    const value = m[kr.metric];
    const hit =
      target === null
        ? true
        : kr.direction === "higher"
          ? value >= target
          : value <= target;
    return {
      period: shortPeriod(m.periodStart),
      milestone: m.milestone,
      value,
      hit,
    };
  });

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {kr.id.toUpperCase()} · {metricLabel(kr.metric)}
        </h3>
        <span className="text-xs text-[var(--muted)]">
          {kr.direction === "lower" ? "낮을수록 좋음" : "높을수록 좋음"}
        </span>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--card-border)"
              vertical={false}
            />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={{ stroke: "var(--card-border)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${Math.trunc(v * 100)}%`}
              width={42}
              domain={kr.metric === "defectRate" ? [0, "auto"] : [0, 1]}
            />
            {baseline !== null ? (
              <ReferenceLine
                y={baseline}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: "Baseline",
                  position: "insideTopLeft",
                  fill: "#475569",
                  fontSize: 10,
                }}
              />
            ) : null}
            {target !== null ? (
              <ReferenceLine
                y={target}
                stroke={TARGET_HIT}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{
                  value: "Target",
                  position: "insideBottomRight",
                  fill: TARGET_HIT,
                  fontSize: 10,
                }}
              />
            ) : null}
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ stroke: "var(--card-border)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2}
              dot={(props: {
                cx?: number;
                cy?: number;
                index?: number;
                payload?: { hit: boolean };
              }) => {
                const cx = props.cx ?? 0;
                const cy = props.cy ?? 0;
                const hit = props.payload?.hit ?? true;
                const idx = props.index ?? 0;
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r={hit ? 3.5 : 5}
                    fill={hit ? TARGET_HIT : TARGET_MISS}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { milestone: string; value: number; hit: boolean };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-[var(--foreground)]">
        {point.milestone}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {formatPercent(point.value)}{" "}
        <span className={point.hit ? "text-emerald-600" : "text-rose-600"}>
          ({point.hit ? "도달" : "미달"})
        </span>
      </p>
    </div>
  );
}

function ReleaseTable({ metrics }: { metrics: EnrichedMetric[] }) {
  const reversed = [...metrics].reverse();
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <Th>릴리스</Th>
              <Th>배포일</Th>
              <Th className="text-right">TC</Th>
              <Th className="text-right">총 결함</Th>
              <Th className="text-right">미해결</Th>
              <Th className="text-right">배포 후</Th>
              <Th className="text-right">결함률</Th>
              <Th className="text-right">제거율</Th>
              <Th className="text-right">효과성</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {reversed.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <Td>
                  <span className="font-semibold text-[var(--foreground)]">
                    {m.milestone}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-xs text-[var(--muted)]">
                  {m.periodStart}
                </Td>
                <Td className="text-right tabular-nums">{m.tcCount}</Td>
                <Td className="text-right tabular-nums">{m.totalDefects}</Td>
                <Td className="text-right tabular-nums">{m.openDefects}</Td>
                <Td className="text-right tabular-nums">
                  {m.postReleaseDefects}
                </Td>
                <Td className="text-right tabular-nums">
                  {formatPercent(m.defectRate)}
                </Td>
                <Td className="text-right tabular-nums">
                  {formatPercent(m.defectRemovalRate)}
                </Td>
                <Td className="text-right tabular-nums">
                  {formatPercent(m.testEffectiveness)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" className={`px-3 py-2.5 text-left ${className ?? ""}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-sm text-[var(--foreground)] ${className ?? ""}`}
    >
      {children}
    </td>
  );
}
