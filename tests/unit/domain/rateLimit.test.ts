import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  RESET_RATE_WINDOW_MINUTES,
  RESET_REQUESTS_PER_EMAIL,
  RESET_REQUESTS_PER_IP,
  isOverLimit,
  rateWindowStart,
} from "@/lib/domain/rateLimit";

// docs/agent-memory/auth.md A10.
describe("password reset rate limits", () => {
  it("allows 3 per email and 10 per IP in a 15-minute window", () => {
    expect(RESET_REQUESTS_PER_EMAIL).toBe(3);
    expect(RESET_REQUESTS_PER_IP).toBe(10);
    expect(RESET_RATE_WINDOW_MINUTES).toBe(15);
  });

  it.each([
    ["2026-11-15T15:00:00.000Z", "2026-11-15T15:00:00.000Z"],
    ["2026-11-15T15:14:59.999Z", "2026-11-15T15:00:00.000Z"],
    ["2026-11-15T15:15:00.000Z", "2026-11-15T15:15:00.000Z"],
    ["2026-11-15T15:29:30.000Z", "2026-11-15T15:15:00.000Z"],
  ])("puts %s in the window starting %s", (now, start) => {
    expect(rateWindowStart(new Date(now)).toISOString()).toBe(start);
  });

  it("is over the limit only once the count passes it", () => {
    expect(isOverLimit(3, RESET_REQUESTS_PER_EMAIL)).toBe(false);
    expect(isOverLimit(4, RESET_REQUESTS_PER_EMAIL)).toBe(true);
  });

  it("does not read the clock or import outside the domain", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/domain/rateLimit.ts"),
      "utf8",
    );
    expect(source).not.toContain("Date.now");
    expect(source).not.toMatch(/new Date\(\s*\)/);
    expect(source).not.toMatch(/from "(?!\.\/|@\/lib\/domain\/)/);
  });
});
