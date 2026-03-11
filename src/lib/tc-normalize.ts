export type TcSourceType = "notion" | "pdf" | "figma";

export interface NormalizedRequirement {
  requirementKey: string;
  title: string;
  body: string;
  tags: string[];
  priority: "high" | "medium" | "low" | null;
}

const MAX_REQUIREMENT_BODY_LENGTH = 2000;

function compactWhitespace(input: string): string {
  return input.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
}

function stripNotionMarkup(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1");
}

function splitMarkdownLikeSections(input: string): string[] {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    const isSectionStart =
      /^#{1,6}\s+/.test(line) ||
      /^\d+\.\s+/.test(line) ||
      /^[-*]\s+/.test(line) ||
      /^###\s+/.test(line) ||
      /^##\s+/.test(line);

    if (isSectionStart && current.length > 0) {
      sections.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join("\n"));
  }

  return sections;
}

function inferPriority(text: string): "high" | "medium" | "low" | null {
  const lowered = text.toLowerCase();
  if (
    /필수|critical|p0|p1|must|핵심|중요/.test(lowered) ||
    /작업 완료|재고 할당/.test(text)
  ) {
    return "high";
  }
  if (/권장|p2|중간|should/.test(lowered)) {
    return "medium";
  }
  if (/참고|p3|low|nice to have/.test(lowered)) {
    return "low";
  }
  return null;
}

function inferTags(text: string): string[] {
  const candidates: Array<[string, RegExp]> = [
    ["search", /검색|filter|조회/i],
    ["table", /테이블|목록|list/i],
    ["status", /상태|대기|완료|검수/i],
    ["calc", /합계|sum|정합성|수량|계산/i],
    ["popup", /팝업|modal|toast/i],
    ["edge-case", /에러|예외|없음|실패|불가/i],
    ["figma-ui", /figma|ui|화면|컬럼/i],
  ];

  const tags = candidates
    .filter(([, pattern]) => pattern.test(text))
    .map(([tag]) => tag);

  return tags.length > 0 ? tags : ["general"];
}

function toRequirement(
  prefix: string,
  idx: number,
  rawSection: string
): NormalizedRequirement | null {
  const normalized = compactWhitespace(rawSection);
  if (normalized.length < 4) return null;

  const firstSentence = normalized
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s*/, "")
    .slice(0, 80);

  return {
    requirementKey: `${prefix}_${String(idx + 1).padStart(4, "0")}`,
    title: firstSentence || `Requirement ${idx + 1}`,
    body: normalized.slice(0, MAX_REQUIREMENT_BODY_LENGTH),
    tags: inferTags(normalized),
    priority: inferPriority(normalized),
  };
}

function normalizeFigmaMetadata(input: string): string {
  // Figma metadata XML에서 텍스트 노드 이름을 우선적으로 추출해 요구사항 후보로 사용한다.
  const textNameMatches = Array.from(
    input.matchAll(/<text[^>]*name="([^"]+)"[^>]*>/g)
  ).map((match) => match[1]?.trim());

  const unique = [...new Set(textNameMatches.filter(Boolean))];
  if (unique.length === 0) return input;

  return unique.join("\n");
}

export function normalizeSourceToRequirements(
  sourceType: TcSourceType,
  rawInput: string
): NormalizedRequirement[] {
  const preprocessed =
    sourceType === "notion"
      ? stripNotionMarkup(rawInput)
      : sourceType === "figma"
        ? normalizeFigmaMetadata(rawInput)
        : rawInput;

  const sections = splitMarkdownLikeSections(preprocessed);
  const prefix = sourceType.toUpperCase();

  const requirements = sections
    .map((section, idx) => toRequirement(prefix, idx, section))
    .filter((item): item is NormalizedRequirement => Boolean(item));

  if (requirements.length > 0) return requirements;

  const fallback = toRequirement(prefix, 0, preprocessed);
  return fallback ? [fallback] : [];
}

