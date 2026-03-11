import Link from "next/link";
import { TcBuilderShell } from "@/components/TcBuilderShell";
import { TcTemplateManager } from "@/components/TcTemplateManager";

export default async function TcProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <TcBuilderShell
      title="프로젝트 작업 화면"
      subtitle={`프로젝트(${projectId}) 기준으로 템플릿/생성/검증 흐름을 진행합니다.`}
    >
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <Link
          href="/tc"
          className="rounded-md border border-[var(--card-border)] bg-white/[0.02] px-3 py-1.5 text-[var(--muted)] hover:text-white"
        >
          TC 홈으로
        </Link>
      </div>
      <TcTemplateManager initialProjectId={projectId} sectionMode="project" />
    </TcBuilderShell>
  );
}
