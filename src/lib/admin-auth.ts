import { cookies } from "next/headers";

const COOKIE_NAME = "qahub_admin";
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

export function getAdminToken(): string | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token.length < 8) return null;
  return token;
}

export async function verifyAdmin(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  return cookie?.value === token;
}

export async function setAdminCookie(value: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
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
