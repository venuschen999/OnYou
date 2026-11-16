// Typed browser helpers for the auth endpoints (AGENTS.md §3: pages and
// components call lib/api, never fetch Route Handlers directly).

import { SERVER_ERROR_MESSAGE } from "@/lib/messages";

export type ApiUser = { id: string; email: string; timezone: string };
export type SignupRequest = {
  email: string;
  password: string;
  timezone: string;
};
export type LoginRequest = { email: string; password: string };
export type FieldErrors = Record<string, string>;

const NETWORK_STATUS = 0;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = {
  error?: { code?: unknown; message?: unknown; fields?: unknown };
};

function isFieldErrors(value: unknown): value is FieldErrors {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null;
  const error = body?.error;
  if (typeof error?.code !== "string" || typeof error.message !== "string") {
    return new ApiError(
      response.status,
      "INTERNAL_ERROR",
      SERVER_ERROR_MESSAGE,
    );
  }
  const fields = isFieldErrors(error.fields) ? error.fields : undefined;
  return new ApiError(response.status, error.code, error.message, fields);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(NETWORK_STATUS, "NETWORK_ERROR", SERVER_ERROR_MESSAGE);
  }
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

async function postForUser(path: string, body: unknown): Promise<ApiUser> {
  const data = await postJson<{ user: ApiUser }>(path, body);
  return data.user;
}

export function signUp(input: SignupRequest): Promise<ApiUser> {
  return postForUser("/api/auth/signup", input);
}

export function logIn(input: LoginRequest): Promise<ApiUser> {
  return postForUser("/api/auth/login", input);
}

// US2: the server answers the same way for every email (auth.md A11).
export async function requestPasswordReset(email: string): Promise<void> {
  await postJson<{ message: string }>("/api/auth/password-reset/request", {
    email,
  });
}

export async function confirmPasswordReset(input: {
  token: string;
  password: string;
}): Promise<void> {
  await postJson<{ message: string }>(
    "/api/auth/password-reset/confirm",
    input,
  );
}

// US1 / auth.md A17: ends the Active session on every device and signs this
// browser out.
export async function logOut(): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    throw new ApiError(NETWORK_STATUS, "NETWORK_ERROR", SERVER_ERROR_MESSAGE);
  }
  if (!response.ok) throw await toApiError(response);
}
