import { describe, expect, it } from "vitest";
import {
  describeCoverageHeuristicScope,
  filterCoverageHeuristicFeaturesByPagePathPrefix,
  parseCoverageHeuristicArgs,
} from "./coverage-heuristic-scope";

describe("parseCoverageHeuristicArgs", () => {
  it("scoped 옵션을 올바르게 파싱한다", () => {
    expect(
      parseCoverageHeuristicArgs([
        "--apply",
        "--product=cmr",
        "--spec=cmr_monitoring_pom.spec.ts",
        "--exclude-page-path-prefix=/payments",
      ]),
    ).toEqual({
      apply: true,
      excludePagePathPrefixes: ["/payments"],
      product: "cmr",
      specFiles: ["cmr_monitoring_pom.spec.ts"],
    });
  });

  it("빈 값이 들어오면 명시적으로 실패한다", () => {
    expect(() => parseCoverageHeuristicArgs(["--product="])).toThrow(
      "--product 값이 비어 있습니다.",
    );
    expect(() => parseCoverageHeuristicArgs(["--spec="])).toThrow(
      "--spec 값이 비어 있습니다.",
    );
    expect(() =>
      parseCoverageHeuristicArgs(["--exclude-page-path-prefix="]),
    ).toThrow("--exclude-page-path-prefix 값이 비어 있습니다.");
  });
});

describe("describeCoverageHeuristicScope", () => {
  it("scope가 있으면 사용자 로그용 문자열을 만든다", () => {
    expect(
      describeCoverageHeuristicScope({
        apply: false,
        excludePagePathPrefixes: ["/payments"],
        product: "cmr",
        specFiles: ["cmr_monitoring_pom.spec.ts"],
      }),
    ).toBe("product=cmr · spec=cmr_monitoring_pom.spec.ts · exclude=/payments");
  });

  it("scope가 없으면 null을 반환한다", () => {
    expect(
      describeCoverageHeuristicScope({
        apply: false,
        excludePagePathPrefixes: [],
        product: null,
        specFiles: [],
      }),
    ).toBeNull();
  });
});

describe("filterCoverageHeuristicFeaturesByPagePathPrefix", () => {
  it("제외 prefix와 매칭되는 feature를 scope에서 제거한다", () => {
    expect(
      filterCoverageHeuristicFeaturesByPagePathPrefix(
        [
          { id: "1", pagePath: "/payments" },
          { id: "2", pagePath: "/payments/toss" },
          { id: "3", pagePath: "/my-page" },
          { id: "4", pagePath: "/event" },
        ],
        ["/payments"],
      ),
    ).toEqual([
      { id: "3", pagePath: "/my-page" },
      { id: "4", pagePath: "/event" },
    ]);
  });
});
