import Link from "next/link";
import { db } from "@/db";
import { testRuns, testCases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RunCompare } from "@/components/RunCompare";
import type { DiffCategory, CompareTest } from "@/app/api/runs/compare/route";

export const dynamic = "force-dynamic";

function classifyTest(
  statusA: string | undefined,
  statusB: string | undefined,
): DiffCategory {
  if (!statusA && statusB) return "new";
  if (statusA && !statusB) return "removed";

  const aFailed = statusA === "failed" || statusA === "flaky";
  const bFailed = statusB === "failed" || statusB === "flaky";
  const aPassed = statusA === "passed";
  const bPassed = statusB === "passed";

  if (aPassed && bFailed) return "regression";
  if (aFailed && bPassed) return "fixed";
  if (aFailed && bFailed) return "still_failing";
  return "stable";
}

const CATEGORY_ORDER: DiffCategory[] = [
  "regression",
  "still_failing",
  "fixed",
  "new",
  "removed",
  "stable",
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const params = await searchParams;
  const a = params.a;
  const b = params.b;

  if (!a || !b) {
    return (
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center">
          <svg
            aria-hidden="true"
            className="mx-auto mb-3 h-10 w-10 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <p className="text-[var(--muted)]">
            비교할 두 Run ID를 선택해주세요.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const runIdA = Number(a);
  const runIdB = Number(b);

  const [runsA, runsB, casesA, casesB] = await Promise.all([
    db.select().from(testRuns).where(eq(testRuns.runId, runIdA)),
    db.select().from(testRuns).where(eq(testRuns.runId, runIdB)),
    db.select().from(testCases).where(eq(testCases.runId, runIdA)),
    db.select().from(testCases).where(eq(testCases.runId, runIdB)),
  ]);

  if (runsA.length === 0 || runsB.length === 0) {
    return (
      <main id="main-content" className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50 p-10 text-center">
          <svg
            aria-hidden="true"
            className="mx-auto mb-3 h-10 w-10 text-rose-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <p className="text-rose-700">
            Run을 찾을 수 없습니다. (A: #{a}, B: #{b})
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-500"
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const mapA = new Map(casesA.map((tc) => [tc.title, tc]));
  const mapB = new Map(casesB.map((tc) => [tc.title, tc]));
  const allTitles = new Set([...mapA.keys(), ...mapB.keys()]);

  const summary: Record<DiffCategory, number> = {
    regression: 0,
    fixed: 0,
    still_failing: 0,
    new: 0,
    removed: 0,
    stable: 0,
  };

  const tests: CompareTest[] = [];

  for (const title of allTitles) {
    const tcA = mapA.get(title);
    const tcB = mapB.get(title);
    const category = classifyTest(tcA?.status, tcB?.status);
    summary[category]++;

    tests.push({
      title,
      category,
      statusA: tcA?.status ?? null,
      statusB: tcB?.status ?? null,
      durationA: tcA?.durationMs ?? null,
      durationB: tcB?.durationMs ?? null,
      errorMessage: tcB?.errorMessage ?? tcA?.errorMessage ?? null,
    });
  }

  tests.sort(
    (x, y) =>
      CATEGORY_ORDER.indexOf(x.category) - CATEGORY_ORDER.indexOf(y.category),
  );

  return (
    <main id="main-content" className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--muted)] hover:text-slate-900 transition-colors"
        >
          ← 대시보드
        </Link>
        <span className="text-[var(--muted)]">/</span>
        <h1 className="text-lg font-semibold text-slate-900">Run 비교</h1>
      </div>
      <RunCompare data={{ runA: runsA[0], runB: runsB[0], summary, tests }} />
    </main>
  );
}
