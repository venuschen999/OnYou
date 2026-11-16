import { createHash, randomBytes } from "node:crypto";

// docs/agent-memory/auth.md A12; AGENTS.md §12.
export const RESET_TOKEN_TTL_MINUTES = 30;

const TOKEN_BYTES = 32;
const MS_PER_MINUTE = 60_000;

export function generateResetToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

// The token carries 256 random bits, so a fast hash is enough; only this
// hash is stored.
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiry(now: Date): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * MS_PER_MINUTE);
}
