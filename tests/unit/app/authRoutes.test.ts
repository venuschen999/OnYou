import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { logIn, signUp } from "@/lib/server/authService";
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_TTL_SECONDS,
} from "@/lib/server/authToken";
import { AppError } from "@/lib/server/errors";

vi.mock("@/lib/server/authService", () => ({
  signUp: vi.fn(),
  logIn: vi.fn(),
}));

const TOKEN = "signed-token";
const PUBLIC_USER = {
  id: "user_123",
  email: "jo@school.edu",
  timezone: "America/New_York",
};

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function expectAuthCookie(response: Response): void {
  const header = response.headers.get("set-cookie") ?? "";
  expect(header).toContain(`${AUTH_COOKIE_NAME}=${TOKEN}`);
  expect(header).toMatch(/HttpOnly/i);
  expect(header).toMatch(/Secure/i);
  expect(header).toMatch(/SameSite=Lax/i);
  expect(header).toMatch(/Path=\//);
  expect(header).toContain(`Max-Age=${AUTH_TOKEN_TTL_SECONDS}`);
}

beforeEach(() => {
  vi.mocked(signUp).mockReset();
  vi.mocked(logIn).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/auth/signup", () => {
  it("returns 201, the public user, and an auth cookie without the token in the body", async () => {
    vi.mocked(signUp).mockResolvedValue({ user: PUBLIC_USER, token: TOKEN });

    const response = await signup(
      jsonRequest("/api/auth/signup", {
        email: "jo@school.edu",
        password: "sunflower22",
        timezone: "America/New_York",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ user: PUBLIC_USER });
    expectAuthCookie(response);
  });

  it("normalizes the email, falls back the timezone, and passes a server Date", async () => {
    vi.mocked(signUp).mockResolvedValue({ user: PUBLIC_USER, token: TOKEN });

    const response = await signup(
      jsonRequest("/api/auth/signup", {
        email: "  Jo@School.EDU ",
        password: "sunflower22",
        timezone: "Mars/Olympus",
      }),
    );

    expect(response.status).toBe(201);
    expect(signUp).toHaveBeenCalledWith(
      {
        email: "jo@school.edu",
        password: "sunflower22",
        timezone: "America/Los_Angeles",
      },
      expect.any(Date),
    );
  });

  it("rejects an invalid password before creating an account", async () => {
    const response = await signup(
      jsonRequest("/api/auth/signup", {
        email: "jo@school.edu",
        password: "sun",
        timezone: "America/New_York",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fields: { password: "Use 8 to 15 characters. This one has 3." },
      },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const request = new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });

    const response = await signup(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body must be valid JSON.",
      },
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("maps EMAIL_IN_USE to 409 and does not set a cookie", async () => {
    vi.mocked(signUp).mockRejectedValue(
      new AppError(
        "EMAIL_IN_USE",
        "An account with this email already exists.",
        {
          email: "An account with this email already exists.",
        },
      ),
    );

    const response = await signup(
      jsonRequest("/api/auth/signup", {
        email: "jo@school.edu",
        password: "sunflower22",
        timezone: "America/New_York",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EMAIL_IN_USE",
        message: "An account with this email already exists.",
        fields: { email: "An account with this email already exists." },
      },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("hides an unexpected failure as INTERNAL_ERROR", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(signUp).mockRejectedValue(
      new Error("passwordHash sunflower22 leaked"),
    );

    const response = await signup(
      jsonRequest("/api/auth/signup", {
        email: "jo@school.edu",
        password: "sunflower22",
        timezone: "America/New_York",
      }),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Try again.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("sunflower22");
    expect(errorLog).toHaveBeenCalledWith("Unhandled route error:", "Error");
    expect(errorLog.mock.calls.flat().join(" ")).not.toContain("sunflower22");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200, the public user, and an auth cookie without the token in the body", async () => {
    vi.mocked(logIn).mockResolvedValue({ user: PUBLIC_USER, token: TOKEN });

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "jo@school.edu",
        password: "sunflower22",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: PUBLIC_USER });
    expectAuthCookie(response);
  });

  it("drops a timezone field and passes a server Date", async () => {
    vi.mocked(logIn).mockResolvedValue({ user: PUBLIC_USER, token: TOKEN });

    await login(
      jsonRequest("/api/auth/login", {
        email: " Jo@School.edu",
        password: "sunflower22",
        timezone: "Asia/Tokyo",
      }),
    );

    expect(logIn).toHaveBeenCalledWith(
      { email: "jo@school.edu", password: "sunflower22" },
      expect.any(Date),
    );
  });

  it("maps invalid credentials to 401 and does not set a cookie", async () => {
    vi.mocked(logIn).mockRejectedValue(
      new AppError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect. Check both and try again.",
      ),
    );

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "jo@school.edu",
        password: "sunflower22",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect. Check both and try again.",
      },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a password outside 8 to 15 characters before checking the account", async () => {
    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "jo@school.edu",
        password: "p".repeat(16),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(logIn).not.toHaveBeenCalled();
  });

  it("hides an unexpected failure as INTERNAL_ERROR", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(logIn).mockRejectedValue(new Error("jwt secret leaked"));

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "jo@school.edu",
        password: "sunflower22",
      }),
    );

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("jwt secret");
    expect(JSON.parse(text)).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Try again.",
      },
    });
    expect(errorLog).toHaveBeenCalledWith("Unhandled route error:", "Error");
    expect(errorLog.mock.calls.flat().join(" ")).not.toContain("jwt secret");
  });
});
