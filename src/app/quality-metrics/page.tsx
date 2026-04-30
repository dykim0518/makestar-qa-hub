import { asc } from "drizzle-orm";
import { AppHeader } from "@/components/AppHeader";
import { db } from "@/db";
import { qaOkrMetrics } from "@/db/schema";
import {
  buildKrStatuses,
  enrichMetrics,
  type EnrichedMetric,
  type KrStatus,
} from "@/lib/okr-calculations";
import { OKR_2026_H1 } from "@/lib/okr-config";
import { OkrDashboard } from "./OkrDashboard";

export const dynamic = "force-dynamic";

type LoadResult = {
  metrics: EnrichedMetric[];
  krStatuses: KrStatus[];
  error: boolean;
};

async function loadEnriched(): Promise<LoadResult> {
  try {
    const rows = await db
      .select()
      .from(qaOkrMetrics)
      .orderBy(asc(qaOkrMetrics.periodStart));
    const metrics = enrichMetrics(rows);
    return { metrics, krStatuses: buildKrStatuses(metrics), error: false };
  } catch (err) {
    console.error("[quality-metrics] DB fetch failed:", err);
    return { metrics: [], krStatuses: buildKrStatuses([]), error: true };
  }
}

export default async function OkrPage() {
  const { metrics, krStatuses, error } = await loadEnriched();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader active="okr" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            품질 지표 · {OKR_2026_H1.period.start} ~ {OKR_2026_H1.period.end}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)] md:text-3xl">
            2026 상반기 QA 품질 지표
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {OKR_2026_H1.objective}
          </p>
        </header>

        {error ? (
          <DataError />
        ) : (
          <OkrDashboard metrics={metrics} krStatuses={krStatuses} />
        )}
      </main>
    </div>
  );
}

function DataError() {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">
      <p className="text-sm font-semibold">데이터를 불러오지 못했습니다.</p>
      <p className="mt-1 text-sm">
        DB 연결이 일시적으로 불안정할 수 있습니다. 잠시 후 다시 새로고침
        해주세요. 문제가 계속되면 관리자에게 알려주세요.
      </p>
    </div>
  );
}
