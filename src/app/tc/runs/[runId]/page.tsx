import Link from "next/link";
import { TcBuilderShell } from "@/components/TcBuilderShell";
import { TcTemplateManager } from "@/components/TcTemplateManager";
import type { TcGenerationRun } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getRun(runId: string): Promise<TcGenerationRun | null> {
  try {
    const { db } = await import("@/db");
    const { tcGenerationRuns } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [run] = await db
      .select()
      .from(tcGenerationRuns)
      .where(eq(tcGenerationRuns.id, runId))
      .limit(1);
    return run ?? null;
  } catch {
    return null;
  }
}

export default async function TcRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await getRun(runId);

  if (!run) {
    return (
      <TcBuilderShell
        title="Run 작업 화면"
        subtitle={`Run(${runId}) 정보를 찾지 못했습니다.`}
      >
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Run을 찾을 수 없습니다. ID를 확인하거나 TC 홈에서 다시 선택해 주세요.
        </div>
        <div className="mt-4">
          <Link
            href="/tc"
            className="rounded-md border border-[var(--card-border)] bg-white/[0.02] px-3 py-1.5 text-xs text-[var(--muted)] hover:text-white"
          >
            TC 홈으로
          </Link>
        </div>
      </TcBuilderShell>
    );
  }

  return (
    <TcBuilderShell
      title="Run 작업 화면"
      subtitle={`Run(${runId}) 결과 검증과 Google Sheet 내보내기를 진행합니다.`}
    >
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <Link
          href="/tc"
          className="rounded-md border border-[var(--card-border)] bg-white/[0.02] px-3 py-1.5 text-[var(--muted)] hover:text-white"
        >
          TC 홈으로
        </Link>
        <Link
          href={`/tc/projects/${run.projectId}`}
          className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-indigo-300 hover:text-indigo-200"
        >
          프로젝트 화면으로
        </Link>
      </div>
      <TcTemplateManager
        initialProjectId={run.projectId}
        initialRunId={runId}
        sectionMode="run"
      />
    </TcBuilderShell>
  );
}
