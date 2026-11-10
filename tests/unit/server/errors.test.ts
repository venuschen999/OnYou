import { describe, expect, it } from "vitest";
import { AppError, getErrorStatus, type ErrorCode } from "@/lib/server/errors";

// AGENTS.md §9: each error code maps to exactly one HTTP status.
const EXPECTED_STATUS = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  ACTIVE_SESSION_EXISTS: 409,
  EMAIL_IN_USE: 409,
  INTERNAL_ERROR: 500,
} as const satisfies Record<ErrorCode, number>;

describe("AppError status map (AGENTS.md §9)", () => {
  it.each(Object.entries(EXPECTED_STATUS))(
    "maps %s to HTTP %s",
    (code, status) => {
      const errorCode = code as ErrorCode;
      expect(getErrorStatus(errorCode)).toBe(status);

      const error = new AppError(errorCode, "Something needs attention.");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("AppError");
      expect(error.message).toBe("Something needs attention.");
      expect(error.status).toBe(status);
      expect(error.fields).toBeUndefined();
    },
  );

  it("keeps field messages on the error", () => {
    const fields = {
      email: "An account with this email already exists.",
    };
    const error = new AppError("EMAIL_IN_USE", fields.email, fields);

    expect(error.status).toBe(409);
    expect(error.fields).toEqual(fields);
  });
});
