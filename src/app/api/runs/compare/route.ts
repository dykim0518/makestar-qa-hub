import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { testRuns, testCases } from "@/db/schema";
import { eq } from "drizzle-orm";

export type DiffCategory =
  | "regression"
  | "fixed"
  | "still_failing"
  | "new"
  | "removed"
  | "stable";

export interface CompareTest {
  title: string;
  category: DiffCategory;
  statusA: string | null;
  statusB: string | null;
  durationA: number | null;
  durationB: number | null;
  errorMessage: string | null;
}

export interface CompareResult {
  runA: typeof testRuns.$inferSelect;
  runB: typeof testRuns.$inferSelect;
  summary: Record<DiffCategory, number>;
  tests: CompareTest[];
}

const CATEGORY_ORDER: DiffCategory[] = [
  "regression",
  "still_failing",
  "fixed",
  "new",
  "removed",
  "stable",
];

function classifyTest(
  statusA: string | undefined,
  statusB: string | undefined
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const a = searchParams.get("a");
  const b = searchParams.get("b");

  if (!a || !b) {
    return NextResponse.json(
      { error: "Both 'a' and 'b' run IDs are required" },
      { status: 400 }
    );
  }

  const runIdA = Number(a);
  const runIdB = Number(b);

  if (isNaN(runIdA) || isNaN(runIdB)) {
    return NextResponse.json(
      { error: "Invalid run IDs" },
      { status: 400 }
    );
  }

  const [runsA, runsB, casesA, casesB] = await Promise.all([
    db.select().from(testRuns).where(eq(testRuns.runId, runIdA)),
    db.select().from(testRuns).where(eq(testRuns.runId, runIdB)),
    db.select().from(testCases).where(eq(testCases.runId, runIdA)),
    db.select().from(testCases).where(eq(testCases.runId, runIdB)),
  ]);

  if (runsA.length === 0 || runsB.length === 0) {
    return NextResponse.json(
      { error: "One or both runs not found" },
      { status: 404 }
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
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );

  return NextResponse.json({
    runA: runsA[0],
    runB: runsB[0],
    summary,
    tests,
  } satisfies CompareResult);
}
