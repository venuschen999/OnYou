import { ApiError, type FocusSessionView } from "@/lib/api/sessions";

// Wait this long before retrying a completion the server says is too early,
// once the client's clock is already at or past endTime.
export const COMPLETION_RETRY_MS = 1000;

export function completionDelay(endTime: string, nowMs: number): number {
  return Math.max(0, new Date(endTime).getTime() - nowMs);
}

export function completionRetryDelay(endTime: string, nowMs: number): number {
  const remaining = new Date(endTime).getTime() - nowMs;
  return remaining > 0 ? remaining : COMPLETION_RETRY_MS;
}

// SESSION_ABANDONED means the server stored zeros (PRD v2.9 §6). The client
// shows that outcome; it does not derive rewards from the duration.
export type CompletionFailure =
  | { type: "retry" }
  | { type: "abandoned" }
  | { type: "terminal"; status: number; code: string; message: string }
  | { type: "retryable" };

export function classifyCompletionFailure(error: unknown): CompletionFailure {
  if (error instanceof ApiError && error.code === "SESSION_TOO_EARLY") {
    return { type: "retry" };
  }
  if (error instanceof ApiError && error.code === "SESSION_ABANDONED") {
    return { type: "abandoned" };
  }
  if (error instanceof ApiError && error.status < 500) {
    return {
      type: "terminal",
      status: error.status,
      code: error.code,
      message: error.message,
    };
  }
  return { type: "retryable" };
}

export function abandonedSession(session: FocusSessionView): FocusSessionView {
  return {
    ...session,
    status: "ABANDONED",
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
  };
}
