import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIE_NAME, signAuthToken } from "@/lib/server/authToken";
import { proxy } from "@/proxy";

const TEST_SECRET = "unit-test-secret-that-is-at-least-32-chars";
const OTHER_SECRET = "a-different-secret-that-is-also-32-chars!";
const TEMPORARY_REDIRECT = 307;
const CLAIMS = { userId: "user_123", tokenVersion: 0 };
const LONG_AGO = new Date("2020-01-01T00:00:00.000Z");

function requestFor(pathname: string, token?: string): NextRequest {
  const headers: Record<string, string> = token
    ? { cookie: `${AUTH_COOKIE_NAME}=${token}` }
    : {};
  return new NextRequest(`http://localhost${pathname}`, { headers });
}

function expectRedirectToLogin(response: Response): void {
  expect(response.status).toBe(TEMPORARY_REDIRECT);
  expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
    "/login",
  );
}

function expectPassThrough(response: Response): void {
  expect(response.headers.get("location")).toBeNull();
  expect(response.headers.get("x-middleware-next")).toBe("1");
}

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// TODO(#6): add a Playwright test that a signed-out browser opening /dashboard
// lands on /login (docs/agent-memory/auth.md A8.7).
describe("proxy optimistic auth check (docs/agent-memory/auth.md A9)", () => {
  it.each(["/dashboard", "/history", "/settings", "/history?cursor=abc"])(
    "redirects %s to /login when there is no auth cookie",
    async (pathname) => {
      expectRedirectToLogin(await proxy(requestFor(pathname)));
    },
  );

  it("redirects when the JWT was signed with another secret", async () => {
    vi.stubEnv("JWT_SECRET", OTHER_SECRET);
    const forged = await signAuthToken(CLAIMS, new Date());
    vi.stubEnv("JWT_SECRET", TEST_SECRET);

    expectRedirectToLogin(await proxy(requestFor("/dashboard", forged)));
  });

  it("redirects when the JWT has expired", async () => {
    const expired = await signAuthToken(CLAIMS, LONG_AGO);

    expectRedirectToLogin(await proxy(requestFor("/settings", expired)));
  });

  it("lets a request with a valid JWT through", async () => {
    const token = await signAuthToken(CLAIMS, new Date());

    expectPassThrough(await proxy(requestFor("/dashboard", token)));
  });

  it.each(["/login", "/signup", "/api/auth/login", "/api/sessions/active"])(
    "never redirects %s, so a stale session cannot loop",
    async (pathname) => {
      expectPassThrough(await proxy(requestFor(pathname)));
    },
  );
});
