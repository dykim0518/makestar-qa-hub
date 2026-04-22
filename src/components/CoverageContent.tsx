"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CoverageFeatureRow } from "@/app/coverage/page";
import { CoverageOverview } from "@/components/CoverageOverview";
import { CoverageDetail } from "@/components/CoverageDetail";

type Props = {
  rows: CoverageFeatureRow[];
};

const PRODUCT_LABEL: Record<string, string> = {
  cmr: "커머스",
  albumbuddy: "앨범버디",
  admin_makestar: "통합매니저 · 메이크스타",
  admin_pocaalbum: "통합매니저 · 포카앨범",
  admin_albumbuddy: "통합매니저 · 앨범버디",
};

const PRODUCT_ORDER = [
  "admin_makestar",
  "admin_pocaalbum",
  "admin_albumbuddy",
  "cmr",
  "albumbuddy",
];

function productRank(product: string): number {
  const i = PRODUCT_ORDER.indexOf(product);
  return i === -1 ? PRODUCT_ORDER.length : i;
}

export function CoverageContent({ rows }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const products = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.product))).sort(
        (a, b) => productRank(a) - productRank(b),
      ),
    [rows],
  );

  const requestedProduct = searchParams.get("product");
  const product =
    requestedProduct && products.includes(requestedProduct)
      ? requestedProduct
      : products[0] ?? "admin_makestar";
  const category = searchParams.get("category");

  useEffect(() => {
    if (products.length === 0) return;

    const validCategories = new Set(
      rows
        .filter((row) => row.product === product)
        .map((row) => row.category ?? "기타"),
    );
    const hasInvalidProduct = requestedProduct !== null && requestedProduct !== product;
    const hasInvalidCategory = category !== null && !validCategories.has(category);

    if (!hasInvalidProduct && !hasInvalidCategory) return;

    const sp = new URLSearchParams(searchParams.toString());
    sp.set("product", product);
    if (hasInvalidCategory) {
      sp.delete("category");
    }
    router.replace(`/coverage?${sp.toString()}`, { scroll: false });
  }, [category, product, products, requestedProduct, router, rows, searchParams]);

  const setProduct = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("product", next);
      sp.delete("category");
      router.replace(`/coverage?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const openCategory = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("product", product);
      sp.set("category", next);
      router.push(`/coverage?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams, product],
  );

  const backToOverview = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("category");
    router.push(`/coverage?${sp.toString()}`, { scroll: false });
  }, [router, searchParams]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-900">
          등록된 기능이 없습니다
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          크롤러 결과(<code>coverage-crawl-*.json</code>)를 seed로 등록하거나
          수동으로 기능을 추가하세요.
        </p>
      </div>
    );
  }

  const productLabel = PRODUCT_LABEL[product] ?? product;

  return (
    <div className="space-y-6">
      {/* 제품 스위처 */}
      <div className="overflow-x-auto pb-1">
        <div
          className="flex w-max min-w-full items-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-1 shadow-sm"
          role="tablist"
          aria-label="제품 선택"
        >
          {products.map((p) => {
            const isActive = p === product;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setProduct(p)}
                className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {PRODUCT_LABEL[p] ?? p}
              </button>
            );
          })}
        </div>
      </div>

      {category ? (
        <CoverageDetail
          rows={rows}
          product={product}
          productLabel={productLabel}
          category={category}
          onBack={backToOverview}
        />
      ) : (
        <CoverageOverview
          rows={rows}
          product={product}
          productLabel={productLabel}
          onOpenCategory={openCategory}
        />
      )}
    </div>
  );
}
