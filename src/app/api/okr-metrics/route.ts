import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { qaOkrMetrics } from "@/db/schema";
import { verifyAdmin } from "@/lib/admin-auth";

type IncomingMetric = {
  milestone: string;
  periodStart: string;
  periodEnd: string;
  tcCount: number;
  totalDefects: number;
  openDefects: number;
  postReleaseDefects: number;
};

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function parseBody(body: unknown): IncomingMetric | { error: string } {
  if (!body || typeof body !== "object")
    return { error: "본문이 비어있습니다." };
  const o = body as Record<string, unknown>;

  if (typeof o.milestone !== "string" || o.milestone.trim().length === 0)
    return { error: "릴리스 이름은 필수입니다." };
  if (!isIsoDate(o.periodStart))
    return { error: "배포일은 YYYY-MM-DD 형식이어야 합니다." };

  const numericFields = [
    "tcCount",
    "totalDefects",
    "openDefects",
    "postReleaseDefects",
  ] as const;
  const numbers: Record<string, number> = {};
  for (const key of numericFields) {
    const value = o[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return { error: `${key}는 0 이상의 숫자여야 합니다.` };
    }
    if (!Number.isInteger(value)) {
      return { error: `${key}는 정수여야 합니다.` };
    }
    numbers[key] = value;
  }

  if (numbers.openDefects > numbers.totalDefects)
    return { error: "미해결 결함 수는 총 결함 수를 초과할 수 없습니다." };
  if (numbers.postReleaseDefects > numbers.totalDefects)
    return { error: "배포 후 결함 수는 총 결함 수를 초과할 수 없습니다." };

  return {
    milestone: o.milestone.trim(),
    periodStart: o.periodStart,
    periodEnd: o.periodStart,
    tcCount: numbers.tcCount,
    totalDefects: numbers.totalDefects,
    openDefects: numbers.openDefects,
    postReleaseDefects: numbers.postReleaseDefects,
  };
}

export async function GET() {
  const rows = await db
    .select()
    .from(qaOkrMetrics)
    .orderBy(asc(qaOkrMetrics.periodStart));
  return NextResponse.json({ metrics: rows });
}

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 JSON 형식이 아닙니다." },
      { status: 400 },
    );
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const inserted = await db
    .insert(qaOkrMetrics)
    .values({
      milestone: parsed.milestone,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      tcCount: parsed.tcCount,
      totalDefects: parsed.totalDefects,
      openDefects: parsed.openDefects,
      postReleaseDefects: parsed.postReleaseDefects,
    })
    .onConflictDoUpdate({
      target: qaOkrMetrics.milestone,
      set: {
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        tcCount: parsed.tcCount,
        totalDefects: parsed.totalDefects,
        openDefects: parsed.openDefects,
        postReleaseDefects: parsed.postReleaseDefects,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ metric: inserted[0] }, { status: 201 });
}
