import { z } from "zod";

// PRD v2.9 §7 input limits.
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 15;

// docs/agent-memory/auth.md A2: a missing or unknown browser zone falls back to Pacific time.
export const DEFAULT_TIMEZONE = "America/Los_Angeles";

function requiredMessage(message: string) {
  return (issue: { input?: unknown }) =>
    issue.input === undefined ? message : undefined;
}

export const emailSchema = z
  .string({ error: requiredMessage("Enter your email.") })
  .trim()
  // auth.md A4: one stored form keeps lookups simple and matches the LOWER(email) index.
  .toLowerCase()
  .min(1, "Enter your email.")
  .max(
    EMAIL_MAX_LENGTH,
    `Use an email of ${EMAIL_MAX_LENGTH} characters or fewer.`,
  )
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string({ error: requiredMessage("Enter a password.") })
  .superRefine((value, context) => {
    // Count characters, not UTF-16 units, so an emoji counts as one.
    const length = Array.from(value).length;
    if (length >= PASSWORD_MIN_LENGTH && length <= PASSWORD_MAX_LENGTH) return;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters. This one has ${length}.`,
    });
  });

function toCanonicalTimeZone(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

// Zod 4 does not pass a missing object key through z.unknown(). optional()
// keeps an omitted timezone on the same fallback path as an invalid one.
export const timezoneSchema = z
  .unknown()
  .optional()
  .transform((value) => toCanonicalTimeZone(value) ?? DEFAULT_TIMEZONE);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  timezone: timezoneSchema,
});

// z.object strips unknown keys, so login can never carry a timezone (auth.md A3).
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
