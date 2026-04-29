import type { QaOkrMetric } from "@/db/schema";
import { OKR_2026_H1, type KrConfig, type KrMetric } from "@/lib/okr-config";

export type MetricValues = {
  defectRate: number;
  defectRemovalRate: number;
  testEffectiveness: number;
};

export type SignalLevel = "green" | "yellow" | "red";

export type KrStatus = {
  kr: KrConfig;
  baseline: number | null;
  current: number | null;
  targetValue: number | null;
  attainment: number | null;
  remaining: number | null;
  signal: SignalLevel;
};

export type EnrichedMetric = QaOkrMetric & MetricValues;

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

export function pickValue(
  values: MetricValues | null | undefined,
  metric: KrMetric,
): number | null {
  if (!values) return null;
  return values[metric];
}

export function targetValueFor(kr: KrConfig, baseline: number | null): number {
  if (kr.type === "absolute") return kr.target;
  if (baseline === null) return 0;
  if (kr.direction === "lower") return baseline * (1 + kr.target);
  return baseline * (1 + kr.target);
}

export function attainmentFor(
  kr: KrConfig,
  baseline: number | null,
  current: number | null,
): number | null {
  if (current === null) return null;
  if (kr.type === "absolute") {
    if (kr.direction === "higher") {
      return Math.max(0, Math.min(1, current / kr.target));
    }
    return Math.max(0, Math.min(1, kr.target / Math.max(current, 1e-9)));
  }
  if (baseline === null || baseline === 0) return null;
  const target = targetValueFor(kr, baseline);
  const totalDelta = target - baseline;
  const currentDelta = current - baseline;
  if (totalDelta === 0) return current === target ? 1 : 0;
  return Math.max(0, Math.min(1, currentDelta / totalDelta));
}

export function remainingFor(
  kr: KrConfig,
  baseline: number | null,
  current: number | null,
): number | null {
  if (current === null) return null;
  const target =
    kr.type === "absolute" ? kr.target : targetValueFor(kr, baseline);
  if (kr.type === "relative" && baseline === null) return null;
  return target - current;
}

export function signalFor(attainment: number | null): SignalLevel {
  if (attainment === null) return "red";
  if (attainment >= OKR_2026_H1.thresholds.green) return "green";
  if (attainment >= OKR_2026_H1.thresholds.yellow) return "yellow";
  return "red";
}

export function buildKrStatuses(metrics: EnrichedMetric[]): KrStatus[] {
  const sorted = [...metrics].sort((a, b) =>
    a.periodStart < b.periodStart ? -1 : a.periodStart > b.periodStart ? 1 : 0,
  );
  const baselineRow = sorted[0] ?? null;
  const currentRow = sorted[sorted.length - 1] ?? null;

  return OKR_2026_H1.krs.map((kr: KrConfig) => {
    const baseline = kr.baseline ?? pickValue(baselineRow, kr.metric);
    const current = pickValue(currentRow, kr.metric);
    const targetValue =
      kr.type === "absolute"
        ? kr.target
        : baseline !== null
          ? targetValueFor(kr, baseline)
          : null;
    const attainment = attainmentFor(kr, baseline, current);
    const remaining = remainingFor(kr, baseline, current);
    return {
      kr,
      baseline,
      current,
      targetValue,
      attainment,
      remaining,
      signal: signalFor(attainment),
    };
  });
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${Math.trunc(value * 100)}%`;
}
