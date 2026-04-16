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
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--card)] p-10 text-center">
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
      </div>
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
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50 p-10 text-center">
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
      </div>
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
    <div className="mx-auto max-w-6xl px-6 py-10">
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
    </div>
  );
}
