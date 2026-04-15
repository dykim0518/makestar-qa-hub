import { describe, it, expect } from "vitest";
import { parsePlaywrightResults } from "./results-parser";

// 실제 Playwright JSON 리포트 구조를 모사
function mkReport(suites: unknown[], extra: Record<string, unknown> = {}) {
  return {
    stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 0 },
    suites,
    ...extra,
  } as Parameters<typeof parsePlaywrightResults>[0];
}

describe("parsePlaywrightResults — suite path 누적", () => {
  it("파일명 suite는 title에서 제외, describe suite는 포함", () => {
    const report = mkReport([
      {
        title: "admin_order_pom.spec.ts",
        suites: [
          {
            title: "주문관리 @feature:admin_makestar.order.list",
            specs: [
              {
                title: "ORD-PAGE-01: 페이지 검증",
                file: "admin_order_pom.spec.ts",
                tests: [
                  {
                    results: [{ status: "passed", duration: 100 }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const parsed = parsePlaywrightResults(report);
    expect(parsed.testCases).toHaveLength(1);
    expect(parsed.testCases[0].title).toBe(
      "주문관리 @feature:admin_makestar.order.list > ORD-PAGE-01: 페이지 검증",
    );
    expect(parsed.testCases[0].status).toBe("passed");
  });

  it("중첩 describe도 누적", () => {
    const report = mkReport([
      {
        title: "admin_user_pom.spec.ts",
        suites: [
          {
            title: "회원관리 @feature:admin_makestar.user.list",
            suites: [
              {
                title: "검색 기능",
                specs: [
                  {
                    title: "USR-SEARCH-01",
                    tests: [{ results: [{ status: "passed", duration: 50 }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const parsed = parsePlaywrightResults(report);
    expect(parsed.testCases[0].title).toBe(
      "회원관리 @feature:admin_makestar.user.list > 검색 기능 > USR-SEARCH-01",
    );
  });

  it("passed + failed 섞이면 status='failed'", () => {
    const report = mkReport(
      [
        {
          title: "f.spec.ts",
          specs: [
            {
              title: "t1",
              tests: [{ results: [{ status: "passed", duration: 10 }] }],
            },
            {
              title: "t2",
              tests: [
                {
                  results: [
                    {
                      status: "failed",
                      duration: 10,
                      errors: [{ message: "boom" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      { stats: { unexpected: 1 } },
    );
    const parsed = parsePlaywrightResults(report);
    expect(parsed.status).toBe("failed");
    expect(parsed.failed).toBe(1);
    expect(parsed.passed).toBe(1);
  });

  it("같은 결과가 2번 있어도(retry) flaky 처리", () => {
    const report = mkReport([
      {
        title: "f.spec.ts",
        specs: [
          {
            title: "t1",
            tests: [
              {
                results: [
                  {
                    status: "failed",
                    duration: 10,
                    errors: [{ message: "x" }],
                  },
                  { status: "passed", duration: 10 },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const parsed = parsePlaywrightResults(report);
    expect(parsed.testCases[0].status).toBe("flaky");
  });
});
