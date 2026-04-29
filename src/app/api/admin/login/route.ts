import { NextResponse } from "next/server";
import {
  clearAdminCookie,
  getAdminToken,
  setAdminCookie,
} from "@/lib/admin-auth";

export async function POST(req: Request) {
  const expected = getAdminToken();
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_TOKEN 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 JSON 형식이 아닙니다." },
      { status: 400 },
    );
  }

  const token =
    payload &&
    typeof payload === "object" &&
    "token" in payload &&
    typeof (payload as { token: unknown }).token === "string"
      ? (payload as { token: string }).token
      : "";

  if (!token || token !== expected) {
    return NextResponse.json(
      { error: "토큰이 올바르지 않습니다." },
      { status: 401 },
    );
  }

  await setAdminCookie(token);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
