import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "qahub_admin";
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
const HMAC_LABEL = "qahub-admin-cookie";

export function getAdminToken(): string | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token.length < 8) return null;
  return token;
}

/**
 * 토큰을 HMAC-SHA256으로 해시. 쿠키에는 토큰 원문이 아닌 해시만 저장.
 * 쿠키가 유출되어도 ADMIN_TOKEN 자체는 노출되지 않음.
 */
function tokenHash(token: string): string {
  return createHmac("sha256", token).update(HMAC_LABEL).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export async function verifyAdmin(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie?.value) return false;
  return safeEqualHex(cookie.value, tokenHash(token));
}

export async function setAdminCookie(value: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, tokenHash(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
