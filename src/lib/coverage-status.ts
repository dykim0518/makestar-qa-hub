/**
 * 커버리지 상태 계산 (pure function, 테스트 가능).
 *
 * 규칙:
 *  - 실측 passed + failed 섞임 → partial
 *  - 실측 passed만 → covered
 *  - 실측 failed만(flaky 포함) → partial
 *  - 실측이 skipped만 → none (자동화로 인정 X)
 *  - 실측 없고 정적(tag/heuristic) 링크 존재 → heuristic_only (KPI 제외)
 *  - 실측/heuristic 없고 manual 존재 → manual_only
 *  - 아무 링크 없음 → none
 */
export type CoverageLinkInput = {
  status: string | null;
  source: "heuristic" | "manual" | "real" | "tag";
};

export type CoverageStatus =
  | "covered"
  | "partial"
  | "heuristic_only"
  | "manual_only"
  | "none";

export function computeCoverageStatus(
  links: CoverageLinkInput[],
): CoverageStatus {
  const real = links.filter((l) => l.source === "real");
  const heuristic = links.filter(
    (l) => l.source === "heuristic" || l.source === "tag",
  );
  const manual = links.filter((l) => l.source === "manual");

  const realPassed = real.some((l) => l.status === "passed");
  const realFailed = real.some(
    (l) => l.status === "failed" || l.status === "flaky",
  );
  const realSkippedOnly =
    real.length > 0 && real.every((l) => l.status === "skipped");

  if (realPassed && realFailed) return "partial";
  if (realPassed) return "covered";
  if (realFailed) return "partial";
  if (realSkippedOnly) return "none";
  if (heuristic.length > 0) return "heuristic_only";
  if (manual.length > 0) return "manual_only";
  return "none";
}
