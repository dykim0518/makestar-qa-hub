const CANONICAL_COLUMNS = [
  "No",
  "Traceability",
  "Depth 1",
  "Depth 2",
  "Depth 3",
  "Pre-Condition",
  "Step",
  "Expected Result",
  "Result",
  "Issue Key",
  "Description",
] as const;

export type CanonicalColumn = (typeof CANONICAL_COLUMNS)[number];

export interface ColumnMatch {
  canonical: CanonicalColumn;
  index: number;
  header: string;
}

export interface ParsedTemplateProfile {
  headerRowIndex: number;
  columnMapping: ColumnMatch[];
  styleProfile: {
    stepImperativeRatio: number;
    expectedStateRatio: number;
    singleExpectedPerCellRatio: number;
    commonStepVerbs: string[];
    commonExpectedSuffixes: string[];
  };
  previewRows: Array<Record<string, string>>;
}

const COLUMN_ALIASES: Record<CanonicalColumn, string[]> = {
  No: ["no", "번호"],
  Traceability: ["traceability", "requirement", "요구사항", "추적"],
  "Depth 1": ["depth1", "depth 1", "depth_1", "대분류"],
  "Depth 2": ["depth2", "depth 2", "depth_2", "중분류"],
  "Depth 3": ["depth3", "depth 3", "depth_3", "소분류", "기능"],
  "Pre-Condition": ["pre-condition", "precondition", "사전조건", "전제조건"],
  Step: ["step", "테스트절차", "절차", "동작", "action"],
  "Expected Result": ["expected result", "expected", "기대결과", "예상결과"],
  Result: ["result", "결과", "실행결과"],
  "Issue Key": ["issue key", "issue", "jira", "이슈", "ticket"],
  Description: ["description", "비고", "설명", "notes"],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim();
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
}

export function parseCsv(csvText: string): string[][] {
  return csvText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => parseCsvLine(line))
    .filter((cells) => cells.some((cell) => cell.length > 0));
}

function scoreHeaderRow(cells: string[]): {
  score: number;
  matches: ColumnMatch[];
} {
  const normalized = cells.map(normalizeHeader);
  const matches: ColumnMatch[] = [];
  const usedIndexes = new Set<number>();

  for (const canonical of CANONICAL_COLUMNS) {
    const aliases = [canonical, ...COLUMN_ALIASES[canonical]].map(normalizeHeader);
    let foundIndex = -1;

    for (let idx = 0; idx < normalized.length; idx += 1) {
      if (usedIndexes.has(idx)) continue;
      const value = normalized[idx];
      if (!value) continue;
      if (aliases.includes(value)) {
        foundIndex = idx;
        break;
      }
    }

    if (foundIndex >= 0) {
      usedIndexes.add(foundIndex);
      matches.push({
        canonical,
        index: foundIndex,
        header: cells[foundIndex] || canonical,
      });
    }
  }

  return { score: matches.length, matches };
}

function detectHeaderRow(rows: string[][]): { index: number; matches: ColumnMatch[] } {
  let best = { score: 0, index: -1, matches: [] as ColumnMatch[] };
  const maxScan = Math.min(rows.length, 50);

  for (let idx = 0; idx < maxScan; idx += 1) {
    const row = rows[idx];
    const candidate = scoreHeaderRow(row);
    if (candidate.score > best.score) {
      best = { score: candidate.score, index: idx, matches: candidate.matches };
    }
  }

  if (best.index < 0 || best.score < 4) {
    throw new Error("헤더 행을 탐지하지 못했습니다. 시트 컬럼 구조를 확인해 주세요.");
  }

  return { index: best.index, matches: best.matches };
}

function getColumnValue(row: string[], mapping: ColumnMatch[], canonical: CanonicalColumn): string {
  const match = mapping.find((m) => m.canonical === canonical);
  if (!match) return "";
  return (row[match.index] || "").trim();
}

function computeStyleProfile(
  rows: string[][],
  mapping: ColumnMatch[],
  headerRowIndex: number
) {
  const sampleRows = rows.slice(headerRowIndex + 1, headerRowIndex + 81);
  const steps = sampleRows.map((row) => getColumnValue(row, mapping, "Step")).filter(Boolean);
  const expecteds = sampleRows
    .map((row) => getColumnValue(row, mapping, "Expected Result"))
    .filter(Boolean);

  const imperativeKeywords = ["클릭", "입력", "선택", "조회", "확인", "탭", "버튼"];
  const stateKeywords = ["노출됨", "저장됨", "가능함", "불가함", "변경됨", "표시됨"];

  const stepImperativeCount = steps.filter((s) =>
    imperativeKeywords.some((keyword) => s.includes(keyword))
  ).length;
  const expectedStateCount = expecteds.filter((s) =>
    stateKeywords.some((keyword) => s.includes(keyword))
  ).length;
  const singleExpectedCount = expecteds.filter(
    (s) => !/[,\n]| 그리고 | 및 /.test(s)
  ).length;

  const commonStepVerbs = imperativeKeywords
    .map((keyword) => ({
      keyword,
      count: steps.filter((s) => s.includes(keyword)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => item.keyword);

  const commonExpectedSuffixes = stateKeywords
    .map((keyword) => ({
      keyword,
      count: expecteds.filter((s) => s.includes(keyword)).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => item.keyword);

  return {
    stepImperativeRatio: steps.length ? stepImperativeCount / steps.length : 0,
    expectedStateRatio: expecteds.length ? expectedStateCount / expecteds.length : 0,
    singleExpectedPerCellRatio: expecteds.length
      ? singleExpectedCount / expecteds.length
      : 0,
    commonStepVerbs,
    commonExpectedSuffixes,
  };
}

function buildPreviewRows(
  rows: string[][],
  mapping: ColumnMatch[],
  headerRowIndex: number
): Array<Record<string, string>> {
  return rows.slice(headerRowIndex + 1, headerRowIndex + 21).map((row) => {
    const out: Record<string, string> = {};
    for (const match of mapping) {
      out[match.canonical] = (row[match.index] || "").trim();
    }
    return out;
  });
}

export function buildTemplateProfileFromCsv(csvText: string): ParsedTemplateProfile {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("CSV 내용이 비어 있습니다.");
  }

  const { index, matches } = detectHeaderRow(rows);

  return {
    headerRowIndex: index,
    columnMapping: matches,
    styleProfile: computeStyleProfile(rows, matches, index),
    previewRows: buildPreviewRows(rows, matches, index),
  };
}

export function extractGoogleSheetInfo(inputUrl: string): {
  spreadsheetId: string;
  gid: string | null;
  exportUrl: string;
} {
  const url = new URL(inputUrl);
  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Google Sheets URL 형식이 올바르지 않습니다.");
  }
  const spreadsheetId = match[1];
  const gid = url.searchParams.get("gid");
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${
    gid ? `&gid=${gid}` : ""
  }`;

  return { spreadsheetId, gid, exportUrl };
}

