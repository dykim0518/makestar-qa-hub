export type KrMetric = "defectRate" | "defectRemovalRate" | "testEffectiveness";

export type KrTargetType = "absolute" | "relative";

export type KrDirection = "lower" | "higher";

export type KrConfig = {
  id: "kr1" | "kr2" | "kr3";
  name: string;
  metric: KrMetric;
  type: KrTargetType;
  target: number;
  direction: KrDirection;
  baseline: number | null;
  formula: string;
  description: string;
};

export const OKR_2026_H1 = {
  objective: "제품 품질 안정화를 위한 체계적 QA 운영 체계를 구축한다.",
  period: { start: "2026-01-01", end: "2026-06-30" },
  krs: [
    {
      id: "kr1",
      name: "결함률 20% 개선",
      metric: "defectRate",
      type: "relative",
      target: -0.2,
      direction: "lower",
      baseline: 0.35,
      formula: "총 결함 수 / TC 수",
      description: "1월 baseline 35% 대비 6월 결함률 20% 낮춤 (목표 28%)",
    },
    {
      id: "kr2",
      name: "결함 제거율 90% 이상",
      metric: "defectRemovalRate",
      type: "absolute",
      target: 0.9,
      direction: "higher",
      baseline: 0.9,
      formula: "(총 결함 수 - 미해결 결함 수) / 총 결함 수",
      description: "1월 baseline 90% 유지 — 절대 목표 90% 이상",
    },
    {
      id: "kr3",
      name: "테스트 효과성 95% 이상 유지",
      metric: "testEffectiveness",
      type: "absolute",
      target: 0.95,
      direction: "higher",
      baseline: 0.95,
      formula: "총 결함 수 / (총 결함 수 + 배포 후 결함 수)",
      description: "1월 baseline 95% 유지 — 절대 목표 95% 이상 (회귀 방지)",
    },
  ] as const satisfies readonly KrConfig[],
  thresholds: { green: 0.8, yellow: 0.5 },
} as const;

export type OkrPeriod = typeof OKR_2026_H1;
