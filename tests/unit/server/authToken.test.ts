import { SignJWT } from "jose";
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

// Signs a token the app's helper would never produce, so verifyAuthToken's
// claim checks are tested with a signature that is otherwise valid.
async function signCustomPayload(
  claims: Record<string, unknown>,
  subject?: string,
): Promise<string> {
  const issuedAt = Math.floor(ISSUED_AT.getTime() / MS_PER_SECOND);
  const token = new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 60);
  if (subject !== undefined) token.setSubject(subject);
  return token.sign(new TextEncoder().encode(TEST_SECRET));
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
    vi.stubEnv("JWT_SECRET", undefined);
    await expect(signAuthToken(CLAIMS, ISSUED_AT)).rejects.toThrow(
      "JWT_SECRET must be set to at least 32 characters",
    );
  });

  it("refuses to sign when JWT_SECRET is empty", async () => {
    vi.stubEnv("JWT_SECRET", "");
    await expect(signAuthToken(CLAIMS, ISSUED_AT)).rejects.toThrow(
      "JWT_SECRET must be set to at least 32 characters",
    );
  });

  it("refuses a JWT_SECRET shorter than 32 characters", async () => {
    vi.stubEnv("JWT_SECRET", "x".repeat(31));
    await expect(signAuthToken(CLAIMS, ISSUED_AT)).rejects.toThrow(
      "JWT_SECRET must be set to at least 32 characters",
    );
  });

  it("signs a token when JWT_SECRET is exactly 32 characters", async () => {
    vi.stubEnv("JWT_SECRET", "y".repeat(32));
    const token = await signAuthToken(CLAIMS, ISSUED_AT);
    await expect(verifyAuthToken(token, ISSUED_AT)).resolves.toEqual(CLAIMS);
  });

  it("accepts tokenVersion 0", async () => {
    const token = await signAuthToken(
      { userId: CLAIMS.userId, tokenVersion: 0 },
      ISSUED_AT,
    );
    await expect(verifyAuthToken(token, ISSUED_AT)).resolves.toEqual({
      userId: CLAIMS.userId,
      tokenVersion: 0,
    });
  });

  it("rejects a valid signature whose tokenVersion is not a number", async () => {
    const token = await signCustomPayload({ tv: "2" }, CLAIMS.userId);
    await expect(verifyAuthToken(token, ISSUED_AT)).resolves.toBeNull();
  });

  it("rejects a valid signature that has no subject", async () => {
    const token = await signCustomPayload({ tv: CLAIMS.tokenVersion });
    await expect(verifyAuthToken(token, ISSUED_AT)).resolves.toBeNull();
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
