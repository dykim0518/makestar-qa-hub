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

async function loadEnriched(): Promise<{
  metrics: EnrichedMetric[];
  krStatuses: KrStatus[];
}> {
  try {
    const rows = await db
      .select()
      .from(qaOkrMetrics)
      .orderBy(asc(qaOkrMetrics.periodStart));
    const metrics = enrichMetrics(rows);
    return { metrics, krStatuses: buildKrStatuses(metrics) };
  } catch {
    return { metrics: [], krStatuses: buildKrStatuses([]) };
  }
}

export default async function OkrPage() {
  const { metrics, krStatuses } = await loadEnriched();

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

        <OkrDashboard metrics={metrics} krStatuses={krStatuses} />
      </main>
    </div>
  );
}
