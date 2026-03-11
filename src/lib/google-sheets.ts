import { createSign } from "crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(payload: Record<string, unknown>, privateKey: string): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("spreadsheetId 또는 Google Sheets URL 형식이 올바르지 않습니다.");
  }
  return match[1];
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const subject = process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT;

  if (!clientEmail || !privateKeyRaw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 환경변수가 필요합니다."
    );
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: clientEmail,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  if (subject) payload.sub = subject;

  const assertion = signJwt(payload, privateKey);
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Google access token 발급 실패: ${tokenRes.status} ${text}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error("Google access token 응답이 비정상입니다.");
  }
  return tokenData.access_token;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { accessToken?: string }
): Promise<T> {
  const accessToken = options?.accessToken || (await getAccessToken());
  const res = await fetch(`${GOOGLE_SHEETS_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets API 오류: ${res.status} ${text}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export async function ensureSheets(
  spreadsheetId: string,
  sheetTitles: string[]
): Promise<void> {
  const accessToken = await getAccessToken();
  const info = await apiFetch<{
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(`/${spreadsheetId}?fields=sheets.properties.title`, { accessToken });

  const existing = new Set(
    (info.sheets || [])
      .map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title))
  );

  const toCreate = sheetTitles.filter((title) => !existing.has(title));
  if (toCreate.length === 0) return;

  await apiFetch<{ replies?: unknown[] }>(`/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({
      requests: toCreate.map((title) => ({
        addSheet: { properties: { title } },
      })),
    }),
  });
}

export async function overwriteSheet(
  spreadsheetId: string,
  sheetTitle: string,
  values: Array<Array<string | number | null>>
): Promise<void> {
  const accessToken = await getAccessToken();
  const encodedTitle = encodeURIComponent(`${sheetTitle}!A:ZZ`);

  await fetch(
    `${GOOGLE_SHEETS_API}/${spreadsheetId}/values/${encodedTitle}:clear`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    }
  );

  await apiFetch<{ updatedRange?: string }>(
    `/${spreadsheetId}/values/${encodeURIComponent(
      `${sheetTitle}!A1`
    )}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      accessToken,
      body: JSON.stringify({
        majorDimension: "ROWS",
        values,
      }),
    }
  );
}

