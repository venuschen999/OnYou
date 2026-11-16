// Password-reset request limits (PRD v2.9 US2; docs/agent-memory/auth.md A10).
export const RESET_REQUESTS_PER_EMAIL = 3;
export const RESET_REQUESTS_PER_IP = 10;
export const RESET_RATE_WINDOW_MINUTES = 15;

const MS_PER_MINUTE = 60_000;
const WINDOW_MS = RESET_RATE_WINDOW_MINUTES * MS_PER_MINUTE;

// Fixed windows aligned to the epoch, so every server instance agrees on
// which counter row a request belongs to.
export function rateWindowStart(now: Date): Date {
  return new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS);
}

// `count` already includes the current request.
export function isOverLimit(count: number, limit: number): boolean {
  return count > limit;
}
