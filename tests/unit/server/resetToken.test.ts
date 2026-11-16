import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  RESET_TOKEN_TTL_MINUTES,
  generateResetToken,
  hashResetToken,
  resetTokenExpiry,
} from "@/lib/server/resetToken";

// docs/agent-memory/auth.md A12; AGENTS.md §12.
describe("password reset tokens", () => {
  it("generates 32 random bytes as 64 hex characters", () => {
    expect(generateResetToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never repeats a token", () => {
    const tokens = new Set(
      Array.from({ length: 20 }, () => generateResetToken()),
    );
    expect(tokens.size).toBe(20);
  });

  it("stores a SHA-256 hash, never the token itself", () => {
    const token = generateResetToken();
    const hash = hashResetToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hashResetToken(token)).toBe(hash);
  });

  it("expires 30 minutes after it is created", () => {
    const now = new Date("2026-11-15T15:00:00.000Z");

    expect(RESET_TOKEN_TTL_MINUTES).toBe(30);
    expect(resetTokenExpiry(now).toISOString()).toBe(
      "2026-11-15T15:30:00.000Z",
    );
  });
});
