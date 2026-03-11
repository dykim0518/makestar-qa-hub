import { TcBuilderShell } from "@/components/TcBuilderShell";
import { TcTemplateManager } from "@/components/TcTemplateManager";

export default function TcPage() {
  return (
    <TcBuilderShell
      title="TC Builder 홈"
      subtitle="프로젝트 생성, 템플릿 승인, 생성 실행, 검증/내보내기를 한 화면에서 진행합니다."
    >
      <TcTemplateManager sectionMode="all" />
    </TcBuilderShell>
  );
}
