import type { TcGeneratedCase, TcRequirement } from "@/db/schema";

export interface ValidationIssueDraft {
  issueType: "duplicate" | "missing" | "format";
  severity: "low" | "medium" | "high";
  targetRef: string | null;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ValidationSummary {
  totalCases: number;
  duplicateCount: number;
  missingCount: number;
  formatCount: number;
  issueCount: number;
  coverageRatio: number;
}

const ALLOWED_RESULTS = new Set(["Pass", "Fail", "Not Test", "N/A"]);

function normalizeText(input: string | null | undefined): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): Set<string> {
  return new Set(
    normalizeText(input)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function validateFormat(cases: TcGeneratedCase[]): ValidationIssueDraft[] {
  const issues: ValidationIssueDraft[] = [];

  for (const testCase of cases) {
    if (!testCase.step?.trim()) {
      issues.push({
        issueType: "format",
        severity: "high",
        targetRef: testCase.no || `case:${testCase.id}`,
        message: "Step 값이 비어 있습니다.",
      });
    }

    if (!testCase.expectedResult?.trim()) {
      issues.push({
        issueType: "format",
        severity: "high",
        targetRef: testCase.no || `case:${testCase.id}`,
        message: "Expected Result 값이 비어 있습니다.",
      });
    }

    if (
      testCase.expectedResult &&
      /[\n]|,| 그리고 | 및 | and /i.test(testCase.expectedResult)
    ) {
      issues.push({
        issueType: "format",
        severity: "medium",
        targetRef: testCase.no || `case:${testCase.id}`,
        message: "Expected Result에 다중 기대결과 가능성이 있습니다 (1셀 1결과 규칙 확인 필요).",
      });
    }

    if (!ALLOWED_RESULTS.has(testCase.result)) {
      issues.push({
        issueType: "format",
        severity: "medium",
        targetRef: testCase.no || `case:${testCase.id}`,
        message: `Result 값(${testCase.result})이 허용 목록에 없습니다.`,
      });
    }
  }

  return issues;
}

function validateDuplicates(cases: TcGeneratedCase[]): ValidationIssueDraft[] {
  const issues: ValidationIssueDraft[] = [];
  const map = new Map<string, TcGeneratedCase[]>();

  for (const testCase of cases) {
    const signature = normalizeText(`${testCase.step} ${testCase.expectedResult}`);
    if (!signature) continue;
    const existing = map.get(signature) || [];
    existing.push(testCase);
    map.set(signature, existing);
  }

  for (const [, grouped] of map.entries()) {
    if (grouped.length > 1) {
      const refs = grouped.map((item) => item.no || `case:${item.id}`);
      issues.push({
        issueType: "duplicate",
        severity: "high",
        targetRef: refs[0] || null,
        message: `완전 중복 케이스 ${grouped.length}건 감지: ${refs.join(", ")}`,
        meta: { refs },
      });
    }
  }

  // near duplicate
  const nearChecked = new Set<string>();
  for (let i = 0; i < cases.length; i += 1) {
    for (let j = i + 1; j < cases.length; j += 1) {
      const left = cases[i];
      const right = cases[j];
      const pairKey = `${left.id}-${right.id}`;
      if (nearChecked.has(pairKey)) continue;
      nearChecked.add(pairKey);

      const sim = jaccardSimilarity(
        tokenize(`${left.step} ${left.expectedResult}`),
        tokenize(`${right.step} ${right.expectedResult}`)
      );
      if (sim >= 0.9) {
        issues.push({
          issueType: "duplicate",
          severity: "medium",
          targetRef: left.no || `case:${left.id}`,
          message: `유사 중복 의심 (${Math.round(sim * 100)}%): ${
            left.no || left.id
          } vs ${right.no || right.id}`,
          meta: {
            leftId: left.id,
            rightId: right.id,
            similarity: sim,
          },
        });
      }
    }
  }

  return issues;
}

function validateMissing(
  requirements: TcRequirement[],
  cases: TcGeneratedCase[]
): ValidationIssueDraft[] {
  const issues: ValidationIssueDraft[] = [];
  const linkedRequirementIds = new Set(
    cases.map((testCase) => testCase.requirementId).filter(Boolean)
  );

  for (const requirement of requirements) {
    if (!linkedRequirementIds.has(requirement.id)) {
      issues.push({
        issueType: "missing",
        severity: "high",
        targetRef: requirement.requirementKey || requirement.id,
        message: `요구사항이 테스트케이스에 연결되지 않았습니다: ${requirement.title}`,
        meta: {
          requirementId: requirement.id,
          requirementTitle: requirement.title,
        },
      });
    }
  }

  return issues;
}

export function validateRunCases(
  requirements: TcRequirement[],
  cases: TcGeneratedCase[]
): {
  issues: ValidationIssueDraft[];
  summary: ValidationSummary;
} {
  const duplicateIssues = validateDuplicates(cases);
  const missingIssues = validateMissing(requirements, cases);
  const formatIssues = validateFormat(cases);

  const issues = [...duplicateIssues, ...missingIssues, ...formatIssues];
  const coveredRequirementIds = new Set(
    cases.map((testCase) => testCase.requirementId).filter(Boolean)
  );

  const summary: ValidationSummary = {
    totalCases: cases.length,
    duplicateCount: duplicateIssues.length,
    missingCount: missingIssues.length,
    formatCount: formatIssues.length,
    issueCount: issues.length,
    coverageRatio:
      requirements.length === 0
        ? 0
        : coveredRequirementIds.size / requirements.length,
  };

  return { issues, summary };
}

export function buildCoverageMatrix(
  requirements: TcRequirement[],
  cases: TcGeneratedCase[]
): Array<{
  requirementKey: string;
  requirementTitle: string;
  covered: boolean;
  caseRefs: string[];
}> {
  const grouped = new Map<string, string[]>();
  for (const testCase of cases) {
    if (!testCase.requirementId) continue;
    const refs = grouped.get(testCase.requirementId) || [];
    refs.push(testCase.no || `case:${testCase.id}`);
    grouped.set(testCase.requirementId, refs);
  }

  return requirements.map((requirement) => ({
    requirementKey: requirement.requirementKey || requirement.id,
    requirementTitle: requirement.title,
    covered: grouped.has(requirement.id),
    caseRefs: grouped.get(requirement.id) || [],
  }));
}

