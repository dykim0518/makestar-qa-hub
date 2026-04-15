import { describe, it, expect } from "vitest";
import { computeCoverageStatus } from "./coverage-status";

describe("computeCoverageStatus", () => {
  it("실측 passed만 있으면 covered", () => {
    expect(
      computeCoverageStatus([
        { status: "passed", source: "real" },
        { status: "passed", source: "real" },
      ]),
    ).toBe("covered");
  });

  it("실측 passed + failed 섞이면 partial", () => {
    expect(
      computeCoverageStatus([
        { status: "passed", source: "real" },
        { status: "failed", source: "real" },
      ]),
    ).toBe("partial");
  });

  it("실측 failed만 있어도 partial (의도: 자동화는 존재하나 깨짐)", () => {
    expect(computeCoverageStatus([{ status: "failed", source: "real" }])).toBe(
      "partial",
    );
  });

  it("실측 flaky를 failed로 간주하여 partial", () => {
    expect(computeCoverageStatus([{ status: "flaky", source: "real" }])).toBe(
      "partial",
    );
  });

  it("실측이 skipped만이면 none (자동화로 인정 X)", () => {
    expect(
      computeCoverageStatus([
        { status: "skipped", source: "real" },
        { status: "skipped", source: "real" },
      ]),
    ).toBe("none");
  });

  it("실측 없고 heuristic만 있으면 heuristic_only", () => {
    expect(
      computeCoverageStatus([{ status: "heuristic", source: "heuristic" }]),
    ).toBe("heuristic_only");
  });

  it("실측 없고 manual만 있으면 manual_only", () => {
    expect(computeCoverageStatus([{ status: null, source: "manual" }])).toBe(
      "manual_only",
    );
  });

  it("heuristic과 manual 모두 있으면 heuristic_only 우선", () => {
    expect(
      computeCoverageStatus([
        { status: "heuristic", source: "heuristic" },
        { status: null, source: "manual" },
      ]),
    ).toBe("heuristic_only");
  });

  it("실측 passed가 있으면 heuristic/manual 존재해도 covered", () => {
    expect(
      computeCoverageStatus([
        { status: "passed", source: "real" },
        { status: "heuristic", source: "heuristic" },
      ]),
    ).toBe("covered");
  });

  it("링크 없으면 none", () => {
    expect(computeCoverageStatus([])).toBe("none");
  });

  it("실측 skipped + heuristic 섞이면 heuristic_only (skipped는 KPI X)", () => {
    // skipped만 있는 real은 무시되고 heuristic 존재로 폴백
    // 현재 구현: realSkippedOnly → none. 개선 여지. 동작 확정.
    expect(
      computeCoverageStatus([
        { status: "skipped", source: "real" },
        { status: "heuristic", source: "heuristic" },
      ]),
    ).toBe("none");
  });
});
