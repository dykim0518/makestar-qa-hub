export type ErrorCategory =
  | "network_timeout"
  | "selector_not_found"
  | "assertion_failure"
  | "environment_issue"
  | "unknown";

interface CategoryRule {
  category: ErrorCategory;
  patterns: RegExp[];
}

const RULES: CategoryRule[] = [
  {
    category: "environment_issue",
    patterns: [
      /\b502\b/,
      /\b503\b/,
      /ECONNREFUSED/,
      /ENOTFOUND/,
      /Bad Gateway/i,
      /Service Unavailable/i,
    ],
  },
  {
    category: "network_timeout",
    patterns: [
      /TimeoutError/,
      /Timeout \d+ms exceeded/,
      /net::ERR_/,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /waiting for/i,
      /exceeded.*timeout/i,
    ],
  },
  {
    category: "selector_not_found",
    patterns: [
      /locator\./,
      /waitForSelector/,
      /getByRole/,
      /getByText/,
      /getByTestId/,
      /getByLabel/,
      /strict mode violation/i,
      /resolved to \d+ elements/,
      /No element.*found/i,
    ],
  },
  {
    category: "assertion_failure",
    patterns: [
      /expect\(/,
      /toBe\b/,
      /toHaveText/,
      /toContain/,
      /toEqual/,
      /toHaveCount/,
      /toBeVisible/,
      /toHaveURL/,
      /Expected.*Received/i,
      /AssertionError/,
    ],
  },
];

export function classifyError(
  errorMessage: string | null,
): ErrorCategory | null {
  if (!errorMessage) return null;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(errorMessage))) {
      return rule.category;
    }
  }
  return "unknown";
}

export const ERROR_CATEGORY_DISPLAY: Record<
  ErrorCategory,
  { label: string; color: string; bgColor: string }
> = {
  network_timeout: {
    label: "네트워크/타임아웃",
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
  },
  selector_not_found: {
    label: "셀렉터 못 찾음",
    color: "text-purple-600",
    bgColor: "bg-purple-50 border-purple-200",
  },
  assertion_failure: {
    label: "검증 실패",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  environment_issue: {
    label: "환경 이슈",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
  },
  unknown: {
    label: "기타",
    color: "text-slate-500",
    bgColor: "bg-slate-50 border-slate-200",
  },
};
