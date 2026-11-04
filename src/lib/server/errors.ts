import { NextResponse } from "next/server";
import type { z } from "zod";

// AGENTS.md §9 error codes used so far.
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_IN_USE"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "INTERNAL_ERROR";

export type FieldErrors = Record<string, string>;

type ErrorBody = {
  error: { code: ErrorCode; message: string; fields?: FieldErrors };
};

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = "AppError";
  }
}

function toFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "body");
    fields[field] ??= issue.message;
  }
  return fields;
}

export function parseInput<Schema extends z.ZodTypeAny>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new AppError(
    "VALIDATION_ERROR",
    HTTP_BAD_REQUEST,
    "Check the highlighted fields and try again.",
    toFieldErrors(result.error),
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(
      "VALIDATION_ERROR",
      HTTP_BAD_REQUEST,
      "Request body must be valid JSON.",
    );
  }
}

export function toErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof AppError) {
    const fields = error.fields ? { fields: error.fields } : {};
    return NextResponse.json(
      { error: { code: error.code, message: error.message, ...fields } },
      { status: error.status },
    );
  }
  // AGENTS.md §12: never return internal errors. Log only the error name, not
  // its message, which can contain request data.
  console.error(
    "Unhandled route error:",
    error instanceof Error ? error.name : typeof error,
  );
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Try again.",
      },
    },
    { status: HTTP_INTERNAL_ERROR },
  );
}
