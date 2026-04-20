import { describe, it, expect } from "vitest";
import { extractFeatureTags, extractFeatureTagsFromList } from "./coverage-tag";

describe("extractFeatureTags", () => {
  it("단일 태그 추출", () => {
    expect(
      extractFeatureTags(
        "주문관리 > @feature:admin_makestar.order.list > ORD-PAGE-01",
      ),
    ).toEqual(["admin_makestar.order.list"]);
  });

  it("태그 없으면 빈 배열", () => {
    expect(extractFeatureTags("ORD-PAGE-01: 페이지 검증")).toEqual([]);
  });

  it("복수 태그 추출 및 중복 제거", () => {
    expect(
      extractFeatureTags(
        "@feature:admin_makestar.user.list @feature:admin_makestar.user.list @feature:admin_makestar.user.detail",
      ),
    ).toEqual(["admin_makestar.user.list", "admin_makestar.user.detail"]);
  });

  it("점·밑줄·하이픈 허용, 공백 전까지 캡처", () => {
    expect(extractFeatureTags("@feature:a_b.c-d.e foo")).toEqual(["a_b.c-d.e"]);
  });

  it("Playwright metadata tag 배열에서도 feature 태그만 추출한다", () => {
    expect(
      extractFeatureTagsFromList([
        "feature:cmr.home",
        "@feature:cmr.shop",
        "smoke",
        "feature:cmr.home",
      ]),
    ).toEqual(["cmr.home", "cmr.shop"]);
  });
});
