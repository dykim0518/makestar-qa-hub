import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcProjects } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  const projects = await db
    .select()
    .from(tcProjects)
    .orderBy(desc(tcProjects.createdAt))
    .limit(limit);

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  let body: { name?: string; ownerUserId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const ownerUserId =
    body.ownerUserId?.trim() || request.headers.get("x-user-id") || "local-user";

  const [created] = await db
    .insert(tcProjects)
    .values({
      name,
      ownerUserId,
    })
    .returning();

  return NextResponse.json({ project: created }, { status: 201 });
}

