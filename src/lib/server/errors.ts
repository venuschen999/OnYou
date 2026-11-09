// AGENTS.md §9: each error code maps to exactly one HTTP status.
const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  ACTIVE_SESSION_EXISTS: 409,
  EMAIL_IN_USE: 409,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type FieldErrors = Record<string, string>;

// Thrown by services and helpers; handlers turn it into the standard error body.
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = "AppError";
    this.status = ERROR_STATUS[code];
  }
}

export function getErrorStatus(code: ErrorCode): number {
  return ERROR_STATUS[code];
}
