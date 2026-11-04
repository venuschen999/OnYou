import { NextResponse } from "next/server";
import type { z } from "zod";
import {
  AppError,
  getErrorStatus,
  type ErrorCode,
  type FieldErrors,
} from "./errors";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";

type ErrorBody = {
  error: { code: ErrorCode; message: string; fields?: FieldErrors };
};

function toFieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "body");
    fields[field] ??= issue.message;
  }
  return fields;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
}

export function parseInput<Schema extends z.ZodTypeAny>(
  schema: Schema,
  input: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new AppError(
    "VALIDATION_ERROR",
    "Check the highlighted fields and try again.",
    toFieldErrors(result.error),
  );
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
        message: SERVER_ERROR_MESSAGE,
      },
    },
    { status: getErrorStatus("INTERNAL_ERROR") },
  );
}
