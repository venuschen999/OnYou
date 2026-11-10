import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEZONE,
  loginSchema,
  signupSchema,
} from "@/lib/validation/auth";

const VALID_PASSWORD = "sunflower22";
const VALID_TIMEZONE = "America/New_York";

function signupInput(overrides: Record<string, unknown> = {}) {
  return {
    email: "jo@school.edu",
    password: VALID_PASSWORD,
    timezone: VALID_TIMEZONE,
    ...overrides,
  };
}

function emailOfLength(length: number): string {
  const domain = "@example.com";
  return "a".repeat(length - domain.length) + domain;
}

function firstIssueMessage(input: unknown): string | undefined {
  const result = signupSchema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe("signupSchema email (PRD v2.9 §7)", () => {
  it("accepts a valid email", () => {
    expect(signupSchema.safeParse(signupInput()).success).toBe(true);
  });

  it("trims and lowercases the email", () => {
    const result = signupSchema.parse(
      signupInput({ email: "  Jo@School.EDU " }),
    );
    expect(result.email).toBe("jo@school.edu");
  });

  it("asks for an email when the field is omitted", () => {
    const { password, timezone } = signupInput();
    expect(firstIssueMessage({ password, timezone })).toBe("Enter your email.");
  });

  it("rejects a blank email", () => {
    expect(signupSchema.safeParse(signupInput({ email: "  " })).success).toBe(
      false,
    );
  });

  it("rejects a non-string email without treating it as a missing field", () => {
    const result = signupSchema.safeParse(signupInput({ email: 12 }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).not.toBe("Enter your email.");
  });

  it("rejects a malformed email", () => {
    expect(
      signupSchema.safeParse(signupInput({ email: "not-an-email" })).success,
    ).toBe(false);
  });

  it("accepts an email of exactly 254 characters", () => {
    const result = signupSchema.safeParse(
      signupInput({ email: emailOfLength(254) }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an email of 255 characters instead of truncating it", () => {
    const result = signupSchema.safeParse(
      signupInput({ email: emailOfLength(255) }),
    );
    expect(result.success).toBe(false);
  });
});

describe("signupSchema password (PRD v2.9 §7)", () => {
  it.each([8, 15])("accepts a %i-character password", (length) => {
    const result = signupSchema.safeParse(
      signupInput({ password: "p".repeat(length) }),
    );
    expect(result.success).toBe(true);
  });

  it.each([7, 16])("rejects a %i-character password", (length) => {
    const result = signupSchema.safeParse(
      signupInput({ password: "p".repeat(length) }),
    );
    expect(result.success).toBe(false);
  });

  it("asks for a password when the field is omitted", () => {
    const { email, timezone } = signupInput();
    expect(firstIssueMessage({ email, timezone })).toBe("Enter a password.");
  });

  it("states the allowed range and the actual length (mockup copy)", () => {
    expect(firstIssueMessage(signupInput({ password: "sun" }))).toBe(
      "Use 8 to 15 characters. This one has 3.",
    );
  });

  it("counts an emoji as one character, not two UTF-16 units", () => {
    expect(
      signupSchema.safeParse(signupInput({ password: "aaaaaaa🔒" })).success,
    ).toBe(true);
    expect(firstIssueMessage(signupInput({ password: "aaaaaa🔒" }))).toBe(
      "Use 8 to 15 characters. This one has 7.",
    );
  });
});

describe("signupSchema timezone (PRD v2.9 §6; docs/agent-memory/auth.md A2)", () => {
  it("keeps a valid IANA timezone", () => {
    expect(signupSchema.parse(signupInput()).timezone).toBe(VALID_TIMEZONE);
  });

  it("falls back to Pacific time when the timezone is missing", () => {
    const { email, password } = signupInput();
    expect(signupSchema.parse({ email, password }).timezone).toBe(
      DEFAULT_TIMEZONE,
    );
    expect(DEFAULT_TIMEZONE).toBe("America/Los_Angeles");
  });

  it("falls back to Pacific time when the timezone is not an IANA zone", () => {
    const result = signupSchema.parse(
      signupInput({ timezone: "Mars/Olympus" }),
    );
    expect(result.timezone).toBe(DEFAULT_TIMEZONE);
  });

  it("falls back to Pacific time when the timezone is blank", () => {
    expect(signupSchema.parse(signupInput({ timezone: "   " })).timezone).toBe(
      DEFAULT_TIMEZONE,
    );
  });

  it("falls back to Pacific time when the timezone is not a string", () => {
    expect(signupSchema.parse(signupInput({ timezone: 480 })).timezone).toBe(
      DEFAULT_TIMEZONE,
    );
  });

  it.each([
    ["US/Pacific", "America/Los_Angeles"],
    ["asia/tokyo", "Asia/Tokyo"],
  ])("stores %s as the canonical IANA zone %s", (input, canonical) => {
    expect(signupSchema.parse(signupInput({ timezone: input })).timezone).toBe(
      canonical,
    );
  });
});

describe("loginSchema (PRD v2.9 §7)", () => {
  it("accepts a valid email and password and normalizes the email", () => {
    const result = loginSchema.parse({
      email: " Jo@School.edu",
      password: VALID_PASSWORD,
    });
    expect(result).toEqual({
      email: "jo@school.edu",
      password: VALID_PASSWORD,
    });
  });

  it("drops a timezone field so login can never change it", () => {
    const result = loginSchema.parse({
      email: "jo@school.edu",
      password: VALID_PASSWORD,
      timezone: "Asia/Tokyo",
    });
    expect(result).not.toHaveProperty("timezone");
  });

  it("rejects a password outside 8 to 15 characters", () => {
    const result = loginSchema.safeParse({
      email: "jo@school.edu",
      password: "p".repeat(16),
    });
    expect(result.success).toBe(false);
  });
});
