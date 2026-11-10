import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "@/lib/server/errors";
import { parseInput, readJsonBody, toErrorResponse } from "@/lib/server/http";
import { loginSchema } from "@/lib/validation/auth";

const LOGIN_URL = "http://localhost/api/auth/login";

function requestWithBody(body: string): Request {
  return new Request(LOGIN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("readJsonBody", () => {
  it("returns parsed JSON", async () => {
    await expect(
      readJsonBody(requestWithBody('{"email":"jo@school.edu"}')),
    ).resolves.toEqual({
      email: "jo@school.edu",
    });
  });

  it("returns JSON null instead of treating it as a parse failure", async () => {
    await expect(readJsonBody(requestWithBody("null"))).resolves.toBeNull();
  });

  it("rejects a body that is not JSON", async () => {
    await expect(
      readJsonBody(requestWithBody("{not json")),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Request body must be valid JSON.",
    });
  });

  it("rejects an empty body", async () => {
    const request = new Request(LOGIN_URL, { method: "POST" });
    await expect(readJsonBody(request)).rejects.toBeInstanceOf(AppError);
  });
});

describe("parseInput", () => {
  it("returns the schema output, including normalized fields", () => {
    expect(
      parseInput(loginSchema, {
        email: "  Jo@School.EDU ",
        password: "sunflower22",
      }),
    ).toEqual({ email: "jo@school.edu", password: "sunflower22" });
  });

  it("rejects invalid input with the standard message and field errors", () => {
    expect(() =>
      parseInput(loginSchema, { email: "not-an-email", password: "short" }),
    ).toThrow(AppError);

    try {
      parseInput(loginSchema, { email: "not-an-email", password: "short" });
    } catch (error) {
      expect(error).toMatchObject({
        code: "VALIDATION_ERROR",
        status: 400,
        message: "Check the highlighted fields and try again.",
        fields: {
          email: "Enter a valid email address.",
          password: "Use 8 to 15 characters. This one has 5.",
        },
      });
    }
  });

  it("keeps the first message when one field has several issues", () => {
    const schema = z.object({
      task: z.string().superRefine((value, context) => {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `first:${value}`,
        });
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "second",
        });
      }),
    });

    expect(() => parseInput(schema, { task: "a" })).toThrow(AppError);
    try {
      parseInput(schema, { task: "a" });
    } catch (error) {
      expect(error).toMatchObject({ fields: { task: "first:a" } });
      if (error instanceof AppError) {
        expect(error.fields?.task).not.toBe("second");
      }
    }
  });

  it("keys a nested issue by its top-level field", () => {
    const schema = z.object({
      user: z.object({
        email: z.string().min(1, "Enter your email."),
      }),
    });

    try {
      parseInput(schema, { user: { email: "" } });
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toMatchObject({ fields: { user: "Enter your email." } });
    }
  });

  it("uses body when an issue has no field path", () => {
    const schema = z.string({ required_error: "Enter a value." });

    try {
      parseInput(schema, undefined);
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toMatchObject({
        fields: { body: expect.any(String) },
      });
    }
  });
});

describe("toErrorResponse (AGENTS.md §9 and §12)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the AppError status, code, message, and fields", async () => {
    const response = toErrorResponse(
      new AppError(
        "EMAIL_IN_USE",
        "An account with this email already exists.",
        {
          email: "An account with this email already exists.",
        },
      ),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EMAIL_IN_USE",
        message: "An account with this email already exists.",
        fields: { email: "An account with this email already exists." },
      },
    });
  });

  it("omits fields when the AppError has none", async () => {
    const response = toErrorResponse(
      new AppError("UNAUTHENTICATED", "Log in to continue."),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
    expect(body.error).not.toHaveProperty("fields");
  });

  it("hides an unexpected Error message and logs only its name", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("password hash sunflower22 leaked");
    failure.name = "QueryError";

    const response = toErrorResponse(failure);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Try again.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("sunflower22");
    expect(errorLog).toHaveBeenCalledWith(
      "Unhandled route error:",
      "QueryError",
    );
    expect(errorLog.mock.calls.flat().join(" ")).not.toContain("sunflower22");
  });

  it("hides a thrown non-Error value", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse("database unavailable");

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("database unavailable");
    expect(errorLog).toHaveBeenCalledWith("Unhandled route error:", "string");
  });
});
