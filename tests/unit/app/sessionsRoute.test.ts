import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as startSessionRoute } from "@/app/api/sessions/route";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import {
  startSession,
  type SessionResponse,
} from "@/lib/server/sessionService";

vi.mock("@/lib/server/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/server/sessionService", () => ({
  startSession: vi.fn(),
}));

const USER = {
  id: "user_1",
  email: "jo@school.edu",
  timezone: "America/New_York",
};

const SESSION = {
  id: "session_1",
  taskName: "Focus session",
  durationMinutes: 25,
  status: "ACTIVE",
  startTime: "2026-11-09T15:00:00.000Z",
  endTime: "2026-11-09T15:25:00.000Z",
  lastHeartbeatAt: "2026-11-09T15:00:00.000Z",
  coinsEarned: 0,
  feedingMinutesEarned: 0,
  applesEarned: 0,
} satisfies SessionResponse;

function request(body: unknown, cookie?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookie) headers.set("cookie", cookie);
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(getAuthenticatedUser).mockReset();
  vi.mocked(startSession).mockReset();
  vi.mocked(getAuthenticatedUser).mockResolvedValue(USER);
});

describe("POST /api/sessions route (#12)", () => {
  it("returns 201 with the session and no completion token", async () => {
    vi.mocked(startSession).mockResolvedValue(SESSION);

    const response = await startSessionRoute(
      request({ durationMinutes: 25 }, "onyou_session=token"),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(SESSION);
    expect(body).not.toHaveProperty("sessionToken");
    expect(body).not.toHaveProperty("token");
    expect(startSession).toHaveBeenCalledWith(
      USER.id,
      { taskName: "Focus session", durationMinutes: 25 },
      expect.any(Date),
    );
  });

  it("rejects an unauthenticated request before starting a session", async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Log in to continue."),
    );

    const response = await startSessionRoute(request({ durationMinutes: 25 }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
    expect(startSession).not.toHaveBeenCalled();
  });

  it("rejects a duration outside 15, 25, or 50 minutes", async () => {
    const response = await startSessionRoute(request({ durationMinutes: 20 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fields: { durationMinutes: "Choose 15, 25, or 50 minutes." },
      },
    });
    expect(startSession).not.toHaveBeenCalled();
  });
});
