import type { User } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_TTL_SECONDS,
  signAuthToken,
} from "@/lib/server/authToken";

const TEST_SECRET = "unit-test-secret-that-is-at-least-32-chars";
const NOW = new Date("2026-11-03T15:00:00.000Z");
const MS_PER_SECOND = 1000;

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/server/db", () => ({
  prisma: { user: { findUnique } },
}));

function userRecord(overrides: Partial<User> = {}): User {
  return {
    id: "user_123",
    email: "jo@school.edu",
    passwordHash: "stored-hash",
    timezone: "America/New_York",
    tokenVersion: 2,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function requestWithCookieHeader(cookie: string | undefined): Request {
  const headers = cookie === undefined ? undefined : { cookie };
  return new Request("http://localhost/api/pet", { headers });
}

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
  findUnique.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthenticatedUser (auth.md A7)", () => {
  it("returns the public user for the account in the auth cookie", async () => {
    const user = userRecord();
    findUnique.mockResolvedValue(user);
    const token = await signAuthToken(
      { userId: user.id, tokenVersion: user.tokenVersion },
      NOW,
    );

    const authenticated = await getAuthenticatedUser(
      requestWithCookieHeader(
        `theme=dark; ${AUTH_COOKIE_NAME}=${token}; extra=1`,
      ),
      NOW,
    );

    expect(findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
    expect(authenticated).toEqual({
      id: user.id,
      email: user.email,
      timezone: user.timezone,
    });
    expect(authenticated).not.toHaveProperty("passwordHash");
    expect(authenticated).not.toHaveProperty("tokenVersion");
  });

  it("rejects a request with no auth cookie", async () => {
    await expect(
      getAuthenticatedUser(requestWithCookieHeader(undefined), NOW),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("does not accept a bearer token in place of the cookie", async () => {
    const token = await signAuthToken(
      { userId: "user_123", tokenVersion: 2 },
      NOW,
    );
    const request = new Request("http://localhost/api/pet", {
      headers: { authorization: `Bearer ${token}` },
    });

    await expect(getAuthenticatedUser(request, NOW)).rejects.toBeInstanceOf(
      AppError,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("does not treat a longer cookie name as the auth cookie", async () => {
    const token = await signAuthToken(
      { userId: "user_123", tokenVersion: 2 },
      NOW,
    );

    await expect(
      getAuthenticatedUser(
        requestWithCookieHeader(`${AUTH_COOKIE_NAME}_extra=${token}`),
        NOW,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects an empty auth cookie", async () => {
    await expect(
      getAuthenticatedUser(
        requestWithCookieHeader(`${AUTH_COOKIE_NAME}=`),
        NOW,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects a cookie that is not a valid token", async () => {
    await expect(
      getAuthenticatedUser(
        requestWithCookieHeader(`${AUTH_COOKIE_NAME}=not-a-token`),
        NOW,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    const token = await signAuthToken(
      { userId: "user_123", tokenVersion: 2 },
      NOW,
    );
    const afterExpiry = new Date(
      NOW.getTime() + AUTH_TOKEN_TTL_SECONDS * MS_PER_SECOND,
    );

    await expect(
      getAuthenticatedUser(
        requestWithCookieHeader(`${AUTH_COOKIE_NAME}=${token}`),
        afterExpiry,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects a token whose tokenVersion is out of date", async () => {
    findUnique.mockResolvedValue(userRecord({ tokenVersion: 3 }));
    const token = await signAuthToken(
      { userId: "user_123", tokenVersion: 2 },
      NOW,
    );

    await expect(
      getAuthenticatedUser(
        requestWithCookieHeader(`${AUTH_COOKIE_NAME}=${token}`),
        NOW,
      ),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
      message: "Log in to continue.",
    });
  });

  it("rejects a token for a user that no longer exists", async () => {
    findUnique.mockResolvedValue(null);
    const token = await signAuthToken(
      { userId: "deleted_user", tokenVersion: 0 },
      NOW,
    );

    await expect(
      getAuthenticatedUser(
        requestWithCookieHeader(`${AUTH_COOKIE_NAME}=${token}`),
        NOW,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: "deleted_user" } });
  });
});
