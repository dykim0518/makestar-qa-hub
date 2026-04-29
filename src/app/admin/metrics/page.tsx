import { asc } from "drizzle-orm";
import { AppHeader } from "@/components/AppHeader";
import { db } from "@/db";
import { qaOkrMetrics, type QaOkrMetric } from "@/db/schema";
import { getAdminToken, verifyAdmin } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";
import { MetricForm } from "./MetricForm";

export const dynamic = "force-dynamic";

async function loadMetrics(): Promise<QaOkrMetric[]> {
  try {
    return await db
      .select()
      .from(qaOkrMetrics)
      .orderBy(asc(qaOkrMetrics.periodStart));
  } catch {
    return [];
  }
}

export default async function AdminMetricsPage() {
  const tokenConfigured = getAdminToken() !== null;
  const isAdmin = tokenConfigured && (await verifyAdmin());
  const metrics = isAdmin ? await loadMetrics() : [];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader active="okr" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
            관리자 전용
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)] md:text-3xl">
            릴리스 지표 입력
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            릴리스가 배포될 때마다 지표를 입력합니다. 같은 릴리스 이름으로 다시
            입력하면 최신 값으로 갱신됩니다.
          </p>
        </header>

        {!tokenConfigured ? (
          <ConfigError />
        ) : !isAdmin ? (
          <LoginForm />
        ) : (
          <MetricForm existing={metrics} />
        )}
      </main>
    </div>
  );
}

function ConfigError() {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
      <p className="text-sm font-semibold">
        ADMIN_TOKEN 환경변수가 설정되지 않았습니다.
      </p>
      <p className="mt-2 text-sm">
        Vercel 환경변수 또는 .env.local에 ADMIN_TOKEN(8자 이상)을 설정한 뒤 다시
        시도해주세요.
      </p>
    </div>
  );
}
