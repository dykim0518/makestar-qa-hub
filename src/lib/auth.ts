import { NextRequest, NextResponse } from "next/server";

export function validateApiSecret(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.DASHBOARD_API_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: DASHBOARD_API_SECRET not set" },
      { status: 500 }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
