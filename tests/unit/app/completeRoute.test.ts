import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as completeSessionRoute } from "@/app/api/sessions/[id]/complete/route";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import {
  completeSession,
  type SessionResponse,
} from "@/lib/server/sessionService";

vi.mock("@/lib/server/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/server/sessionService", () => ({
  completeSession: vi.fn(),
}));

const USER = {
  id: "user_1",
  email: "jo@school.edu",
  timezone: "America/New_York",
};

const SESSION = {
  id: "session_1",
  taskName: "Essay draft: intro",
  durationMinutes: 25,
  status: "COMPLETED",
  startTime: "2026-11-09T15:00:00.000Z",
  endTime: "2026-11-09T15:25:00.000Z",
  lastHeartbeatAt: "2026-11-09T15:24:50.000Z",
  coinsEarned: 25,
  feedingMinutesEarned: 25,
  applesEarned: 1,
} satisfies SessionResponse;

function request(body?: unknown, cookie?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request("http://localhost/api/sessions/session_1/complete", {
    method: "POST",
    headers,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}

function post(body?: unknown, cookie?: string): Promise<Response> {
  return completeSessionRoute(request(body, cookie), {
    params: Promise.resolve({ id: "session_1" }),
  });
}

beforeEach(() => {
  vi.mocked(getAuthenticatedUser).mockReset();
  vi.mocked(completeSession).mockReset();
  vi.mocked(getAuthenticatedUser).mockResolvedValue(USER);
});

describe("POST /api/sessions/{id}/complete route (#15)", () => {
  it("returns the stored session and does not forward client rewards", async () => {
    vi.mocked(completeSession).mockResolvedValue(SESSION);

    const response = await post(
      { coinsEarned: 999, applesEarned: 9, status: "COMPLETED" },
      "onyou_auth=token",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-session-token")).toBeNull();
    const body = await response.json();
    expect(body).toEqual(SESSION);
    expect(body).not.toHaveProperty("sessionToken");
    expect(body).not.toHaveProperty("token");
    expect(completeSession).toHaveBeenCalledTimes(1);
    expect(completeSession).toHaveBeenCalledWith(
      USER.id,
      "session_1",
      expect.any(Date),
    );
  });

  it("rejects an unauthenticated request before completion", async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Log in to continue."),
    );

    const response = await post();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
    expect(completeSession).not.toHaveBeenCalled();
  });

  it("maps too-early and abandoned completion to 409", async () => {
    vi.mocked(completeSession).mockRejectedValueOnce(
      new AppError(
        "SESSION_TOO_EARLY",
        "This session has not reached its scheduled end.",
      ),
    );
    const early = await post(undefined, "onyou_auth=token");
    expect(early.status).toBe(409);
    await expect(early.json()).resolves.toEqual({
      error: {
        code: "SESSION_TOO_EARLY",
        message: "This session has not reached its scheduled end.",
      },
    });

    vi.mocked(completeSession).mockRejectedValueOnce(
      new AppError(
        "SESSION_ABANDONED",
        "This session was abandoned and cannot be completed.",
      ),
    );
    const abandoned = await post(undefined, "onyou_auth=token");
    expect(abandoned.status).toBe(409);
    await expect(abandoned.json()).resolves.toEqual({
      error: {
        code: "SESSION_ABANDONED",
        message: "This session was abandoned and cannot be completed.",
      },
    });
  });
});
