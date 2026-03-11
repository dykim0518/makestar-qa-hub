import { NextResponse } from "next/server";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] || "*"}*@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export async function GET() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || "";
  const subject = process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT?.trim() || "";

  const hasEmail = clientEmail.length > 0;
  const hasPrivateKey = privateKey.length > 0;

  return NextResponse.json({
    configured: hasEmail && hasPrivateKey,
    hasEmail,
    hasPrivateKey,
    subjectConfigured: subject.length > 0,
    serviceAccountEmailMasked: hasEmail ? maskEmail(clientEmail) : null,
  });
}
