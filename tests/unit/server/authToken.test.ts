import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_TTL_SECONDS,
  buildAuthCookie,
  signAuthToken,
  verifyAuthToken,
} from "@/lib/server/authToken";

const TEST_SECRET = "unit-test-secret-that-is-at-least-32-chars";
const OTHER_SECRET = "a-different-secret-that-is-also-32-chars!";
const ISSUED_AT = new Date("2026-11-03T15:00:00.000Z");
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const MS_PER_SECOND = 1000;
const CLAIMS = { userId: "user_123", tokenVersion: 2 };

function secondsAfterIssue(seconds: number): Date {
  return new Date(ISSUED_AT.getTime() + seconds * MS_PER_SECOND);
}

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth token lifetime (docs/agent-memory/auth.md A1)", () => {
  it("is 7 days", () => {
    expect(AUTH_TOKEN_TTL_SECONDS).toBe(SEVEN_DAYS_SECONDS);
  });
});

describe("signAuthToken / verifyAuthToken", () => {
  it("round-trips userId and tokenVersion", async () => {
    const token = await signAuthToken(CLAIMS, ISSUED_AT);
    await expect(verifyAuthToken(token, ISSUED_AT)).resolves.toEqual(CLAIMS);
  });

  it("accepts the token one second before it expires", async () => {
    const token = await signAuthToken(CLAIMS, ISSUED_AT);
    const now = secondsAfterIssue(SEVEN_DAYS_SECONDS - 1);
    await expect(verifyAuthToken(token, now)).resolves.toEqual(CLAIMS);
  });

  it("rejects the token once 7 days have passed", async () => {
    const token = await signAuthToken(CLAIMS, ISSUED_AT);
    const now = secondsAfterIssue(SEVEN_DAYS_SECONDS);
    await expect(verifyAuthToken(token, now)).resolves.toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signAuthToken(CLAIMS, ISSUED_AT);
    const [header, payload, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "someone_else", tv: 2 }),
    ).toString("base64url");
    expect(payload).not.toBe(forgedPayload);
    const tampered = [header, forgedPayload, signature].join(".");
    await expect(verifyAuthToken(tampered, ISSUED_AT)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    vi.stubEnv("JWT_SECRET", OTHER_SECRET);
    const token = await signAuthToken(CLAIMS, ISSUED_AT);
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    await expect(verifyAuthToken(token, ISSUED_AT)).resolves.toBeNull();
  });

  it("rejects a value that is not a JWT", async () => {
    await expect(verifyAuthToken("garbage", ISSUED_AT)).resolves.toBeNull();
  });

  it("refuses to sign when JWT_SECRET is missing", async () => {
    vi.stubEnv("JWT_SECRET", "");
    await expect(signAuthToken(CLAIMS, ISSUED_AT)).rejects.toThrow(
      "JWT_SECRET",
    );
  });
});

describe("buildAuthCookie (AGENTS.md §12)", () => {
  it("is HttpOnly, Secure, SameSite=Lax, site-wide, and lasts 7 days", () => {
    expect(buildAuthCookie("token-value")).toEqual({
      name: AUTH_COOKIE_NAME,
      value: "token-value",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SEVEN_DAYS_SECONDS,
    });
  });
});
