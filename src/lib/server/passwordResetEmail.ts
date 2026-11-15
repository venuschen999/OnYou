import { RESET_TOKEN_TTL_MINUTES } from "./resetToken";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const RESET_PATH = "/reset-password";
const SUBJECT = "Reset your OnYou password";

export type ResetEmailEnv = {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  APP_URL?: string;
  VERCEL_URL?: string;
};

// auth.md A13: a configured base, never the request Host header.
export function buildResetLink(token: string, env: ResetEmailEnv): string {
  const configured = env.APP_URL?.trim().replace(/\/+$/, "");
  const vercel = env.VERCEL_URL?.trim();
  const base = configured || (vercel ? `https://${vercel}` : "");
  if (!base) throw new Error("APP_URL or VERCEL_URL must be set");
  return `${base}${RESET_PATH}?token=${encodeURIComponent(token)}`;
}

function resetEmailText(link: string): string {
  return `Someone asked to reset the password for your OnYou account. Open this link to choose a new password: ${link} The link works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email; your password stays the same.`;
}

// auth.md A12: password reset is the only email OnYou sends, and only
// through Resend (AGENTS.md §2).
export async function sendPasswordResetEmail(
  input: { to: string; link: string },
  env: ResetEmailEnv,
): Promise<void> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be set");
  }
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: SUBJECT,
      text: resetEmailText(input.link),
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the email with status ${response.status}`);
  }
}
