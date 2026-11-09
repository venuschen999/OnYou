import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, logIn, signUp } from "@/lib/api/auth";

const fetchMock = vi.fn<typeof fetch>();
const USER = { id: "u1", email: "jo@school.edu", timezone: "America/New_York" };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("lib/api/auth client helpers (#9)", () => {
  it("signUp posts JSON to /api/auth/signup and returns the user", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { user: USER }));
    const input = {
      email: "jo@school.edu",
      password: "sunflower22",
      timezone: "America/New_York",
    };

    await expect(signUp(input)).resolves.toEqual(USER);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/auth/signup");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it("logIn posts JSON to /api/auth/login and returns the user", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: USER }));
    const input = { email: "jo@school.edu", password: "sunflower22" };

    await expect(logIn(input)).resolves.toEqual(USER);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/auth/login");
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it("turns the standard error body into an ApiError", async () => {
    const message = "An account with this email already exists.";
    fetchMock.mockResolvedValue(
      jsonResponse(409, {
        error: { code: "EMAIL_IN_USE", message, fields: { email: message } },
      }),
    );

    const error = await signUp({
      email: "jo@school.edu",
      password: "sunflower22",
      timezone: "UTC",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "EMAIL_IN_USE",
      message,
      fields: { email: message },
    });
  });

  it("turns a network failure into an ApiError with NETWORK_ERROR", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await logIn({
      email: "jo@school.edu",
      password: "sunflower22",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("turns a non-JSON error response into an ApiError with INTERNAL_ERROR", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502</html>", { status: 502 }),
    );

    const error = await logIn({
      email: "jo@school.edu",
      password: "sunflower22",
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 502, code: "INTERNAL_ERROR" });
  });
});
