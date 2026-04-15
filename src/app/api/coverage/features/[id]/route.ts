import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qaCoverageFeatures } from "@/db/schema";
import { eq } from "drizzle-orm";

type PatchBody = {
  priority?: "critical" | "high" | "medium" | "low";
  tag?: string | null;
  isActive?: boolean;
  notes?: string | null;
};

const ALLOWED_PRIORITIES = new Set(["critical", "high", "medium", "low"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Partial<typeof qaCoverageFeatures.$inferInsert> = {};
  if (body.priority !== undefined) {
    if (!ALLOWED_PRIORITIES.has(body.priority)) {
      return NextResponse.json(
        {
          error: `priority must be one of ${[...ALLOWED_PRIORITIES].join(", ")}`,
        },
        { status: 400 },
      );
    }
    updates.priority = body.priority;
  }
  if (body.tag !== undefined) {
    updates.tag =
      typeof body.tag === "string" && body.tag.trim() !== ""
        ? body.tag.trim()
        : null;
  }
  if (body.isActive !== undefined) {
    updates.isActive = Boolean(body.isActive);
  }
  if (body.notes !== undefined) {
    updates.notes =
      typeof body.notes === "string" && body.notes.trim() !== ""
        ? body.notes
        : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updatedAt = new Date();
  const result = await db
    .update(qaCoverageFeatures)
    .set(updates)
    .where(eq(qaCoverageFeatures.id, id))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Feature not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, feature: result[0] });
}
