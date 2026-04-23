import { describe, expect, it } from "vitest";
import {
  buildCoverageStaticPlan,
  parseCoverageSpec,
  type CoverageStaticFeature,
} from "./coverage-static-map";

describe("parseCoverageSpec", () => {
  it("개행된 describe 체인과 중첩 describe를 올바르게 분리한다", () => {
    const parsed = parseCoverageSpec(
      "cmr_monitoring_pom.spec.ts",
      `
        import { test } from "@playwright/test";

        test.describe
          .serial("네비게이션 검증 @feature:cmr.home", () => {
            test("CMR-NAV-01", async () => {});

            test.describe("내부 그룹 @feature:cmr.shop", () => {
              test("CMR-NAV-02", async () => {});
            });

            test("CMR-NAV-03", async () => {});
          });
      `,
    );

    expect(parsed.titles).toEqual([
      "CMR-NAV-01",
      "CMR-NAV-02",
      "CMR-NAV-03",
    ]);
    expect(parsed.describes).toEqual([
      {
        startLine: 4,
        tags: ["cmr.home"],
        testTitles: ["CMR-NAV-01", "CMR-NAV-03"],
        title: "네비게이션 검증 @feature:cmr.home",
      },
      {
        startLine: 8,
        tags: ["cmr.shop"],
        testTitles: ["CMR-NAV-02"],
        title: "내부 그룹 @feature:cmr.shop",
      },
    ]);
  });

  it("동적 for...of 제목과 따옴표가 포함된 제목을 보존한다", () => {
    const parsed = parseCoverageSpec(
      "admin_excel_pom.spec.ts",
      `
        import { test } from "@playwright/test";

        const TARGETS = [
          {
            id: "CAT-EXCEL-01",
            name: "대분류 목록 > 엑셀다운받기 @feature:admin_makestar.product.list",
          },
          {
            id: "ORD-EXCEL-01",
            name: "주문관리 > 주문 엑셀 다운로드 @feature:admin_makestar.order.list",
          },
        ];

        test.describe("Admin 엑셀 다운로드 검증", () => {
          for (const t of TARGETS) {
            test(\`\${t.id}: \${t.name}\`, async () => {});
          }

          test('ORD-FILTER-01: 주문 상태="결제완료" 필터', async () => {});
        });
      `,
    );

    expect(parsed.titles).toEqual([
      "CAT-EXCEL-01: 대분류 목록 > 엑셀다운받기 @feature:admin_makestar.product.list",
      "ORD-EXCEL-01: 주문관리 > 주문 엑셀 다운로드 @feature:admin_makestar.order.list",
      'ORD-FILTER-01: 주문 상태="결제완료" 필터',
    ]);
    expect(parsed.taggedTests.map((testCase) => testCase.title)).toEqual([
      "CAT-EXCEL-01: 대분류 목록 > 엑셀다운받기 @feature:admin_makestar.product.list",
      "ORD-EXCEL-01: 주문관리 > 주문 엑셀 다운로드 @feature:admin_makestar.order.list",
    ]);
  });
});

describe("buildCoverageStaticPlan", () => {
  it("제품 불일치 태그는 경고하고 keyword fallback에서 제외한다", () => {
    const spec = parseCoverageSpec(
      "cmr_monitoring_pom.spec.ts",
      `
        import { test } from "@playwright/test";

        test.describe("잘못된 태그 @feature:admin_makestar.order.list", () => {
          test("CMR-BAD-01", async () => {});
        });

        test("CMR-UNTAGGED-01", async () => {});
      `,
    );
    const features: CoverageStaticFeature[] = [
      {
        featureName: "커머스 대시보드",
        id: "cmr-dashboard",
        pagePath: "/dashboard",
        pageTitle: "커머스 대시보드",
        product: "cmr",
        tag: "cmr.home",
      },
      {
        featureName: "주문관리 - 목록",
        id: "admin-order",
        pagePath: "/order/list",
        pageTitle: "주문관리",
        product: "admin_makestar",
        tag: "admin_makestar.order.list",
      },
    ];

    const plan = buildCoverageStaticPlan([spec], features);

    expect(plan.warnings).toEqual([
      expect.objectContaining({
        file: "cmr_monitoring_pom.spec.ts",
        kind: "cross_product_tag",
        tag: "admin_makestar.order.list",
      }),
    ]);
    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0].keywordTestTitles).toEqual(["CMR-UNTAGGED-01"]);
    expect(plan.proposals[0].tagMatches).toEqual([]);
  });

  it("test title의 @feature 태그도 정적 태그 매칭으로 사용한다", () => {
    const spec = parseCoverageSpec(
      "admin_excel_pom.spec.ts",
      `
        import { test } from "@playwright/test";

        test("CAT-EXCEL-01: 대분류 목록 > 엑셀다운받기 @feature:admin_makestar.product.list", async () => {});
      `,
    );
    const features: CoverageStaticFeature[] = [
      {
        featureName: "대분류 목록 - 목록",
        id: "product-list",
        pagePath: "/product/new/list",
        pageTitle: "대분류 목록",
        product: "admin_makestar",
        tag: "admin_makestar.product.list",
      },
    ];

    const plan = buildCoverageStaticPlan([spec], features);

    expect(plan.warnings).toEqual([]);
    expect(plan.proposals[0].tagMatches).toEqual([
      {
        featureId: "product-list",
        featureName: "대분류 목록 - 목록",
        ownerKind: "test",
        ownerTitle:
          "CAT-EXCEL-01: 대분류 목록 > 엑셀다운받기 @feature:admin_makestar.product.list",
        pagePath: "/product/new/list",
        tag: "admin_makestar.product.list",
        testTitles: [
          "CAT-EXCEL-01: 대분류 목록 > 엑셀다운받기 @feature:admin_makestar.product.list",
        ],
      },
    ]);
  });

  it("ab_ 스펙은 프론트 AlbumBuddy product로 분류한다", () => {
    const spec = parseCoverageSpec(
      "ab_monitoring_pom.spec.ts",
      `
        import { test } from "@playwright/test";

        test.describe("홈페이지 @feature:albumbuddy.home", () => {
          test("AB-PAGE-01", async () => {});
        });
      `,
    );
    const features: CoverageStaticFeature[] = [
      {
        featureName: "홈/메인",
        id: "albumbuddy-home",
        pagePath: "/shop",
        pageTitle: "AlbumBuddy 홈/샵 메인",
        product: "albumbuddy",
        tag: "albumbuddy.home",
      },
    ];

    const plan = buildCoverageStaticPlan([spec], features);

    expect(plan.warnings).toEqual([]);
    expect(plan.proposals[0].tagMatches).toEqual([
      {
        featureId: "albumbuddy-home",
        featureName: "홈/메인",
        ownerKind: "describe",
        ownerTitle: "홈페이지 @feature:albumbuddy.home",
        pagePath: "/shop",
        tag: "albumbuddy.home",
        testTitles: ["AB-PAGE-01"],
      },
    ]);
  });

  it("admin_albumbuddy_ 스펙은 AlbumBuddy Admin product로 분류한다", () => {
    const spec = parseCoverageSpec(
      "admin_albumbuddy_core_pom.spec.ts",
      `
        import { test } from "@playwright/test";

        test.describe("앨범버디 상품 목록 @feature:admin_albumbuddy.goods.list", () => {
          test("AB-CORE-03", async () => {});
        });
      `,
    );
    const features: CoverageStaticFeature[] = [
      {
        featureName: "상품 목록 - 목록",
        id: "admin-albumbuddy-goods-list",
        pagePath: "/albumbuddy/goods/list",
        pageTitle: "앨범버디 상품 목록",
        product: "admin_albumbuddy",
        tag: "admin_albumbuddy.goods.list",
      },
    ];

    const plan = buildCoverageStaticPlan([spec], features);

    expect(plan.warnings).toEqual([]);
    expect(plan.proposals[0].tagMatches).toEqual([
      {
        featureId: "admin-albumbuddy-goods-list",
        featureName: "상품 목록 - 목록",
        ownerKind: "describe",
        ownerTitle: "앨범버디 상품 목록 @feature:admin_albumbuddy.goods.list",
        pagePath: "/albumbuddy/goods/list",
        tag: "admin_albumbuddy.goods.list",
        testTitles: ["AB-CORE-03"],
      },
    ]);
  });
});
