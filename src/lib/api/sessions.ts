export type SessionPetView = {
  name: string;
  feedingState: "STARVING" | "HUNGRY" | "FULL";
  apples: number;
  feedingMinutes: number;
  minutesUntilNextApple: number;
};

export type FocusSessionView = {
  id: string;
  taskName: string;
  durationMinutes: number;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  startTime: string;
  endTime: string;
  lastHeartbeatAt: string;
  coinsEarned: number;
  feedingMinutesEarned: number;
  applesEarned: number;
  // Present on a completion response. Other session routes omit it.
  pet?: SessionPetView;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type ErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};

function isErrorBody(body: unknown): body is ErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return false;
  }
  const error = body.error;
  if (typeof error !== "object" || error === null) return false;
  if (!("code" in error) || !("message" in error)) return false;
  return typeof error.code === "string" && typeof error.message === "string";
}

async function readError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!isErrorBody(body)) {
    return new ApiError(
      response.status,
      "INTERNAL_ERROR",
      "Something went wrong. Try again.",
    );
  }
  return new ApiError(
    response.status,
    body.error.code,
    body.error.message,
    body.error.fields,
  );
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export function getActiveSession(): Promise<FocusSessionView | null> {
  return requestJson<FocusSessionView | null>("/api/sessions/active");
}

export function startSession(input: {
  taskName: string;
  durationMinutes: number;
}): Promise<FocusSessionView> {
  return requestJson<FocusSessionView>("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function heartbeatSession(sessionId: string): Promise<FocusSessionView> {
  return requestJson<FocusSessionView>(`/api/sessions/${sessionId}/heartbeat`, {
    method: "POST",
  });
}

export function completeSession(sessionId: string): Promise<FocusSessionView> {
  return requestJson<FocusSessionView>(`/api/sessions/${sessionId}/complete`, {
    method: "POST",
  });
}
