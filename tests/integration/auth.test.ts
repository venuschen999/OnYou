import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { getAuthenticatedUser } from "@/lib/server/auth";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_TTL_SECONDS,
  signAuthToken,
  verifyAuthToken,
} from "@/lib/server/authToken";
import { resetTestDatabase, testPrisma } from "./testDb";

const EMAIL = "jo@school.edu";
const PASSWORD = "sunflower22";
const TIMEZONE = "America/New_York";
const BCRYPT_COST_PREFIX = /^\$2b\$1[0-9]\$/;
const MS_PER_SECOND = 1000;
const LOGIN_ERROR_MESSAGE =
  "Email or password is incorrect. Check both and try again.";

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function signupRequest(overrides: Record<string, unknown> = {}): Request {
  return jsonRequest("/api/auth/signup", {
    email: EMAIL,
    password: PASSWORD,
    timezone: TIMEZONE,
    ...overrides,
  });
}

function loginRequest(overrides: Record<string, unknown> = {}): Request {
  return jsonRequest("/api/auth/login", {
    email: EMAIL,
    password: PASSWORD,
    ...overrides,
  });
}

function authCookieHeader(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  expect(header).toContain(`${AUTH_COOKIE_NAME}=`);
  return header;
}

function authTokenFrom(response: Response): string {
  const header = authCookieHeader(response);
  const match = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(header);
  return match?.[1] ?? "";
}

function requestWithCookie(token: string): Request {
  return new Request("http://localhost/api/pet", {
    headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
  });
}

async function signUpDefaultUser(): Promise<Response> {
  const response = await signup(signupRequest());
  expect(response.status).toBe(201);
  return response;
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /api/auth/signup (US1, #8)", () => {
  it("creates the account and returns the public user with 201", async () => {
    const response = await signup(signupRequest());

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({
      user: { id: expect.any(String), email: EMAIL, timezone: TIMEZONE },
    });
  });

  it("creates Mochi with the account (docs/agent-memory/pet.md P1)", async () => {
    const response = await signUpDefaultUser();
    const { user } = await response.json();

    const pet = await testPrisma.pet.findUnique({ where: { userId: user.id } });
    expect(pet).toMatchObject({ name: "Mochi", coins: 0 });
  });

  it("stores a bcrypt hash at cost >= 10, never the plain password", async () => {
    await signUpDefaultUser();

    const stored = await testPrisma.user.findFirstOrThrow({
      where: { email: EMAIL },
    });
    expect(stored.passwordHash).not.toBe(PASSWORD);
    expect(stored.passwordHash).toMatch(BCRYPT_COST_PREFIX);
  });

  it("never returns the password hash", async () => {
    const response = await signUpDefaultUser();
    const text = await response.text();
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("$2b$");
  });

  it("stores the email trimmed and lowercased (auth.md A4)", async () => {
    await signup(signupRequest({ email: "  Jo@School.EDU " }));

    const users = await testPrisma.user.findMany();
    expect(users.map((user) => user.email)).toEqual([EMAIL]);
  });

  it("stores the browser timezone sent at signup (PRD v2.9 §6)", async () => {
    await signUpDefaultUser();

    const stored = await testPrisma.user.findFirstOrThrow();
    expect(stored.timezone).toBe(TIMEZONE);
  });

  it("stores Pacific time when the timezone is invalid (auth.md A2)", async () => {
    await signup(signupRequest({ timezone: "Mars/Olympus" }));

    const stored = await testPrisma.user.findFirstOrThrow();
    expect(stored.timezone).toBe("America/Los_Angeles");
  });

  it("sets an HttpOnly, Secure, SameSite=Lax auth cookie for 7 days", async () => {
    const response = await signUpDefaultUser();

    const header = authCookieHeader(response);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Secure/i);
    expect(header).toMatch(/SameSite=Lax/i);
    expect(header).toMatch(/Path=\//);
    expect(header).toContain(`Max-Age=${AUTH_TOKEN_TTL_SECONDS}`);
  });

  it("puts the user's id and tokenVersion in the JWT", async () => {
    const response = await signUpDefaultUser();
    const stored = await testPrisma.user.findFirstOrThrow();

    const claims = await verifyAuthToken(authTokenFrom(response), new Date());
    expect(claims).toEqual({ userId: stored.id, tokenVersion: 0 });
  });

  it("rejects an invalid password with 400 in the standard error shape", async () => {
    const response = await signup(signupRequest({ password: "sun" }));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
    const body = await response.json();
    expect(body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.any(String),
      fields: { password: "Use 8 to 15 characters. This one has 3." },
    });
    await expect(testPrisma.user.count()).resolves.toBe(0);
  });

  it("rejects an email over 254 characters with 400", async () => {
    const tooLong = "a".repeat(243) + "@example.com";
    const response = await signup(signupRequest({ email: tooLong }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields).toHaveProperty("email");
  });

  it("rejects a body that is not JSON with 400", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });

    const response = await signup(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an email already in use, in any case, with 409 EMAIL_IN_USE", async () => {
    await signUpDefaultUser();

    const response = await signup(signupRequest({ email: "JO@school.edu" }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatchObject({
      code: "EMAIL_IN_USE",
      fields: { email: expect.stringContaining("already exists") },
    });
  });

  it("creates only one account when the same email signs up concurrently", async () => {
    const responses = await Promise.all([
      signup(signupRequest()),
      signup(signupRequest()),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    await expect(testPrisma.user.count()).resolves.toBe(1);
    await expect(testPrisma.pet.count()).resolves.toBe(1);
  });
});

describe("POST /api/auth/login (US1, #8)", () => {
  beforeEach(async () => {
    await signUpDefaultUser();
  });

  it("logs in with valid credentials and returns the public user", async () => {
    const response = await login(loginRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      user: { id: expect.any(String), email: EMAIL, timezone: TIMEZONE },
    });
  });

  it("matches the email case-insensitively", async () => {
    const response = await login(loginRequest({ email: " JO@School.edu " }));
    expect(response.status).toBe(200);
  });

  it("sets the auth cookie carrying the current tokenVersion", async () => {
    await testPrisma.user.updateMany({ data: { tokenVersion: 3 } });

    const response = await login(loginRequest());

    const header = authCookieHeader(response);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Secure/i);
    expect(header).toMatch(/SameSite=Lax/i);
    const claims = await verifyAuthToken(authTokenFrom(response), new Date());
    expect(claims?.tokenVersion).toBe(3);
  });

  it("never returns the password hash", async () => {
    const response = await login(loginRequest());
    const text = await response.text();
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("$2b$");
  });

  it("does not change the stored timezone (auth.md A3)", async () => {
    await login(loginRequest({ timezone: "Asia/Tokyo" }));

    const stored = await testPrisma.user.findFirstOrThrow();
    expect(stored.timezone).toBe(TIMEZONE);
  });

  it("returns the same 401 for a wrong password and an unknown email", async () => {
    const wrongPassword = await login(loginRequest({ password: "wrongpass1" }));
    const unknownEmail = await login(
      loginRequest({ email: "nobody@school.edu" }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    const expected = {
      error: { code: "INVALID_CREDENTIALS", message: LOGIN_ERROR_MESSAGE },
    };
    await expect(wrongPassword.json()).resolves.toEqual(expected);
    await expect(unknownEmail.json()).resolves.toEqual(expected);
    expect(wrongPassword.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a password outside 8 to 15 characters with 400", async () => {
    const response = await login(loginRequest({ password: "p".repeat(16) }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("getAuthenticatedUser (auth.md A7)", () => {
  it("returns the public user for a valid auth cookie", async () => {
    const response = await signUpDefaultUser();

    const user = await getAuthenticatedUser(
      requestWithCookie(authTokenFrom(response)),
      new Date(),
    );

    expect(user).toEqual({
      id: expect.any(String),
      email: EMAIL,
      timezone: TIMEZONE,
    });
  });

  it("rejects a request with no auth cookie as 401 UNAUTHENTICATED", async () => {
    const request = new Request("http://localhost/api/pet");

    await expect(
      getAuthenticatedUser(request, new Date()),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });

  it("rejects a token whose tokenVersion is out of date (password reset)", async () => {
    const response = await signUpDefaultUser();
    await testPrisma.user.updateMany({ data: { tokenVersion: 1 } });

    await expect(
      getAuthenticatedUser(
        requestWithCookie(authTokenFrom(response)),
        new Date(),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });

  it("rejects a token for a user that no longer exists", async () => {
    const token = await signAuthToken(
      { userId: "deleted_user", tokenVersion: 0 },
      new Date(),
    );

    await expect(
      getAuthenticatedUser(requestWithCookie(token), new Date()),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });

  it("rejects an expired token", async () => {
    const issuedAt = new Date("2026-01-01T00:00:00.000Z");
    await signUpDefaultUser();
    const stored = await testPrisma.user.findFirstOrThrow();
    const token = await signAuthToken(
      { userId: stored.id, tokenVersion: 0 },
      issuedAt,
    );
    const afterExpiry = new Date(
      issuedAt.getTime() + AUTH_TOKEN_TTL_SECONDS * MS_PER_SECOND,
    );

    await expect(
      getAuthenticatedUser(requestWithCookie(token), afterExpiry),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });
});
