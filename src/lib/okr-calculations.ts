import type { QaOkrMetric } from "@/db/schema";
import { OKR_2026_H1, type KrConfig } from "@/lib/okr-config";

export type MetricValues = {
  defectRate: number;
  defectRemovalRate: number;
  testEffectiveness: number;
};

export type SignalLevel = "green" | "yellow" | "red";

export type TrendDirection = "improving" | "worsening" | "flat";

export type KrAggregation = {
  count: number;
  average: number | null;
  min: number | null;
  max: number | null;
  latest: number | null;
  trend: TrendDirection | null;
};

export type KrStatus = {
  kr: KrConfig;
  baseline: number | null;
  targetValue: number | null;
  aggregation: KrAggregation;
  gap: number | null;
  signal: SignalLevel;
};

export type EnrichedMetric = QaOkrMetric & MetricValues;

export const SIGNAL_BUFFER = 0.1;

export function computeMetricValues(
  row: Pick<
    QaOkrMetric,
    "tcCount" | "totalDefects" | "openDefects" | "postReleaseDefects"
  >,
): MetricValues {
  const totalDefects = row.totalDefects;
  const tcCount = row.tcCount;

  const defectRate = tcCount > 0 ? totalDefects / tcCount : 0;
  const defectRemovalRate =
    totalDefects > 0 ? (totalDefects - row.openDefects) / totalDefects : 0;
  const denom = totalDefects + row.postReleaseDefects;
  const testEffectiveness = denom > 0 ? totalDefects / denom : 0;

  return { defectRate, defectRemovalRate, testEffectiveness };
}

export function enrichMetrics(rows: QaOkrMetric[]): EnrichedMetric[] {
  return rows.map((row) => ({ ...row, ...computeMetricValues(row) }));
}

export function targetValueFor(kr: KrConfig, baseline: number | null): number {
  if (kr.type === "absolute") return kr.target;
  if (baseline === null) return 0;
  return baseline * (1 + kr.target);
}

function aggregate(
  values: number[],
  direction: "lower" | "higher",
): KrAggregation {
  if (values.length === 0) {
    return {
      count: 0,
      average: null,
      min: null,
      max: null,
      latest: null,
      trend: null,
    };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values[values.length - 1];

  let trend: TrendDirection | null = null;
  if (values.length >= 2) {
    const prior = values.slice(0, -1);
    const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const delta = latest - priorAvg;
    const isFlat = Math.abs(delta) < 1e-3;
    if (isFlat) {
      trend = "flat";
    } else if (direction === "lower") {
      trend = delta < 0 ? "improving" : "worsening";
    } else {
      trend = delta > 0 ? "improving" : "worsening";
    }
  }

  return { count: values.length, average, min, max, latest, trend };
}

export function gapFor(
  kr: KrConfig,
  average: number | null,
  target: number | null,
): number | null {
  if (average === null || target === null) return null;
  return kr.direction === "lower" ? target - average : average - target;
}

export function signalForGap(gap: number | null): SignalLevel {
  if (gap === null) return "red";
  if (gap >= SIGNAL_BUFFER) return "green";
  if (gap >= -SIGNAL_BUFFER) return "yellow";
  return "red";
}

export function buildKrStatuses(metrics: EnrichedMetric[]): KrStatus[] {
  const sorted = [...metrics].sort((a, b) =>
    a.periodStart < b.periodStart ? -1 : a.periodStart > b.periodStart ? 1 : 0,
  );

  return OKR_2026_H1.krs.map((kr: KrConfig) => {
    const values = sorted.map((m) => m[kr.metric]);
    const aggregation = aggregate(values, kr.direction);
    const baseline =
      kr.baseline ?? (sorted.length > 0 ? sorted[0][kr.metric] : null);
    const targetValue =
      kr.type === "absolute"
        ? kr.target
        : baseline !== null
          ? targetValueFor(kr, baseline)
          : null;
    const gap = gapFor(kr, aggregation.average, targetValue);
    return {
      kr,
      baseline,
      targetValue,
      aggregation,
      gap,
      signal: signalForGap(gap),
    };
  });
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${Math.trunc(value * 100)}%`;
}

export function formatPercentPoint(
  value: number | null,
  withSign = false,
): string {
  if (value === null || Number.isNaN(value)) return "—";
  const pp = Math.trunc(Math.abs(value) * 100);
  if (!withSign) return `${pp}%p`;
  if (value > 0) return `+${pp}%p`;
  if (value < 0) return `-${pp}%p`;
  return `${pp}%p`;
}
