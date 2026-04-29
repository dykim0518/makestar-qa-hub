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
  type EnrichedMetric,
  type KrStatus,
  type SignalLevel,
} from "@/lib/okr-calculations";
import type { KrMetric } from "@/lib/okr-config";

const SIGNAL_TONE: Record<
  SignalLevel,
  { bg: string; text: string; border: string; bar: string; label: string }
> = {
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    label: "On Track",
  },
  yellow: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    bar: "bg-amber-500",
    label: "At Risk",
  },
  red: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    bar: "bg-rose-500",
    label: "Behind",
  },
};

const KR_STROKE: Record<KrMetric, string> = {
  defectRate: "#e11d48",
  defectRemovalRate: "#059669",
  testEffectiveness: "#6366f1",
};

function formatValue(_metric: KrMetric, value: number | null): string {
  return formatPercent(value);
}

function formatRemaining(
  _metric: KrMetric,
  remaining: number | null,
  direction: "lower" | "higher",
): string {
  if (remaining === null) return "데이터 부족";
  if (Math.abs(remaining) < 1e-9) return "목표 도달";
  const reached =
    (direction === "higher" && remaining <= 0) ||
    (direction === "lower" && remaining >= 0);
  if (reached) return "목표 도달";
  const magnitude = Math.abs(remaining);
  const formatted = `${Math.trunc(magnitude * 100)}%p`;
  return direction === "lower"
    ? `${formatted} 더 낮춰야 함`
    : `${formatted} 더 높여야 함`;
}

function shortPeriod(periodStart: string): string {
  const [, month, day] = periodStart.split("-");
  return `${Number(month)}/${day}`;
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
          아직 입력된 마일스톤이 없습니다
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          관리자 페이지(<code className="font-mono">/admin/metrics</code>)에서
          첫 마일스톤을 입력하면 KR 진행률이 계산됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        {krStatuses.map((status) => (
          <KrCard key={status.kr.id} status={status} />
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
          마일스톤 ({metrics.length})
        </h2>
        <MilestoneTable metrics={metrics} />
      </section>
    </div>
  );
}

function KrCard({ status }: { status: KrStatus }) {
  const tone = SIGNAL_TONE[status.signal];
  const attainmentPct =
    status.attainment === null ? 0 : Math.round(status.attainment * 100);
  const kr = status.kr;

  return (
    <article className="flex flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm transition-all hover:border-[var(--accent)]/30 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            {kr.id.toUpperCase()}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {kr.name}
          </h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.bg} ${tone.text} ${tone.border}`}
        >
          {tone.label}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          현재
        </p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-[var(--foreground)]">
          {formatValue(kr.metric, status.current)}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="font-medium uppercase tracking-wider text-[var(--muted)]">
            {kr.type === "absolute" ? "목표" : "Baseline"}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {kr.type === "absolute"
              ? formatValue(kr.metric, kr.target)
              : formatValue(kr.metric, status.baseline)}
          </dd>
        </div>
        <div>
          <dt className="font-medium uppercase tracking-wider text-[var(--muted)]">
            {kr.type === "absolute" ? "임계치" : "목표"}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {formatValue(kr.metric, status.targetValue)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--muted)]">달성률</span>
          <span className="font-semibold text-[var(--foreground)]">
            {status.attainment === null ? "—" : `${attainmentPct}%`}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${tone.bar}`}
            style={{ width: `${attainmentPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {formatRemaining(kr.metric, status.remaining, kr.direction)}
        </p>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        <span className="font-medium">공식</span>: {kr.formula}
      </p>
    </article>
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
  const data = metrics.map((m) => ({
    period: shortPeriod(m.periodStart),
    milestone: m.milestone,
    value: m[kr.metric],
  }));
  const stroke = KR_STROKE[kr.metric];
  const baseline = status.baseline;
  const target = status.targetValue;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--accent)]/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {kr.id.toUpperCase()} · {kr.name.split(" ")[0]}
        </h3>
        <span className="text-xs text-[var(--muted)]">
          {kr.metric === "defectRate" ? "낮을수록 좋음" : "높을수록 좋음"}
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
                stroke={stroke}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: "Target",
                  position: "insideBottomRight",
                  fill: stroke,
                  fontSize: 10,
                }}
              />
            ) : null}
            <Tooltip
              content={<TrendTooltip metric={kr.metric} />}
              cursor={{ stroke: "var(--card-border)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2}
              dot={{ r: 3, fill: stroke }}
              activeDot={{ r: 5 }}
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
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: { milestone: string; value: number } }>;
  metric?: KrMetric;
}) {
  if (!active || !payload?.length || !metric) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-[var(--foreground)]">
        {point.milestone}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {formatValue(metric, point.value)}
      </p>
    </div>
  );
}

function MilestoneTable({ metrics }: { metrics: EnrichedMetric[] }) {
  const reversed = [...metrics].reverse();
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--card-border)] text-sm">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <Th>마일스톤</Th>
              <Th>기간</Th>
              <Th className="text-right">TC</Th>
              <Th className="text-right">총 결함</Th>
              <Th className="text-right">미해결</Th>
              <Th className="text-right">배포 후</Th>
              <Th className="text-right">결함률</Th>
              <Th className="text-right">제거율</Th>
              <Th className="text-right">효과성</Th>
              <Th>코멘트</Th>
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
                  {m.periodStart} ~ {m.periodEnd}
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
                <Td className="max-w-[260px] truncate text-xs text-[var(--muted)]">
                  {m.comment ?? "—"}
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
