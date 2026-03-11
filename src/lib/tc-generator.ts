import type { TcRequirement, TcTemplateProfile } from "@/db/schema";

export interface GeneratedCaseDraft {
  requirementId: string | null;
  no: string;
  traceability: string;
  depth1: string;
  depth2: string;
  depth3: string;
  preCondition: string;
  step: string;
  expectedResult: string;
  result: string;
  issueKey: string;
  description: string;
}

type CaseType = "A" | "B";

function classifyCaseType(text: string): CaseType {
  if (
    /수량|합계|정합성|계산|할당|판매량|요청량|sum|count|total|ratio|정책/i.test(
      text
    )
  ) {
    return "A";
  }
  return "B";
}

function extractDepth(requirement: TcRequirement): {
  depth1: string;
  depth2: string;
  depth3: string;
} {
  const source = `${requirement.title} ${requirement.body}`;

  const depth1 = /요청 관리/.test(source)
    ? "요청 관리"
    : /입고|검수|작업 현황|작업 관리/.test(source)
      ? "입고~작업 관리"
      : "전체";

  const depth2 = /검색/.test(source)
    ? "검색"
    : /정렬/.test(source)
      ? "정렬"
      : /정책|정의/.test(source)
        ? "정책"
        : /목록|테이블/.test(source)
          ? "목록"
          : "기능";

  const depth3 = requirement.title.slice(0, 60);
  return { depth1, depth2, depth3 };
}

function styleFromProfile(profile: TcTemplateProfile) {
  const style = (profile.styleProfile ?? {}) as {
    commonStepVerbs?: string[];
    commonExpectedSuffixes?: string[];
  };

  return {
    stepVerb:
      style.commonStepVerbs && style.commonStepVerbs.length > 0
        ? style.commonStepVerbs[0]
        : "확인",
    expectedSuffix:
      style.commonExpectedSuffixes && style.commonExpectedSuffixes.length > 0
        ? style.commonExpectedSuffixes[0]
        : "노출됨",
  };
}

function buildCaseId(index: number): string {
  return `AUTO_${String(index + 1).padStart(4, "0")}`;
}

export function generateCasesFromRequirements(
  requirements: TcRequirement[],
  profile: TcTemplateProfile,
  mode: "draft" | "strict"
): GeneratedCaseDraft[] {
  const style = styleFromProfile(profile);
  const out: GeneratedCaseDraft[] = [];

  requirements.forEach((requirement, reqIndex) => {
    const text = `${requirement.title} ${requirement.body}`;
    const caseType = classifyCaseType(text);
    const depth = extractDepth(requirement);
    const baseNo = buildCaseId(out.length);

    if (caseType === "A") {
      out.push({
        requirementId: requirement.id,
        no: baseNo,
        traceability: requirement.requirementKey || baseNo,
        depth1: depth.depth1,
        depth2: depth.depth2,
        depth3: depth.depth3,
        preCondition: "유효한 입력 데이터 준비",
        step: `${style.stepVerb}: ${requirement.title}의 계산/정합성 로직을 실행한다.`,
        expectedResult: `${requirement.title} 계산 결과가 요구사항과 일치함`,
        result: "Not Test",
        issueKey: "",
        description: "CASE A 자동 생성",
      });

      out.push({
        requirementId: requirement.id,
        no: buildCaseId(out.length),
        traceability: requirement.requirementKey || baseNo,
        depth1: depth.depth1,
        depth2: depth.depth2,
        depth3: `${depth.depth3} (Edge)`,
        preCondition: "경계값 또는 누락값 입력",
        step: `${style.stepVerb}: 경계값/예외 입력으로 동일 기능을 재실행한다.`,
        expectedResult: `예외 입력 시 오류 없이 정책에 맞는 처리 ${style.expectedSuffix}`,
        result: "Not Test",
        issueKey: "",
        description: "CASE A 엣지케이스 자동 생성",
      });
      return;
    }

    out.push({
      requirementId: requirement.id,
      no: baseNo,
      traceability: requirement.requirementKey || baseNo,
      depth1: depth.depth1,
      depth2: depth.depth2,
      depth3: depth.depth3,
      preCondition: "",
      step: `${style.stepVerb}: ${requirement.title} 화면/동작을 확인한다.`,
      expectedResult: `${requirement.title} ${style.expectedSuffix}`,
      result: "Not Test",
      issueKey: "",
      description: "CASE B 자동 생성",
    });

    const needEdge =
      mode === "strict" ||
      /에러|예외|없음|실패|불가|제외|삭제/.test(text) ||
      reqIndex % 3 === 0;

    if (needEdge) {
      out.push({
        requirementId: requirement.id,
        no: buildCaseId(out.length),
        traceability: requirement.requirementKey || baseNo,
        depth1: depth.depth1,
        depth2: depth.depth2,
        depth3: `${depth.depth3} (Edge)`,
        preCondition: "비정상 상태 또는 데이터 없음",
        step: `${style.stepVerb}: 비정상 입력/데이터 없음 상태에서 동작을 확인한다.`,
        expectedResult: `예외 상황에서도 안내/차단 정책이 정상 ${style.expectedSuffix}`,
        result: "Not Test",
        issueKey: "",
        description: "CASE B 엣지케이스 자동 생성",
      });
    }
  });

  return out;
}

