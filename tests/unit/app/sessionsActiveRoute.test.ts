import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getActiveSessionRoute } from "@/app/api/sessions/active/route";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import {
  getActiveSession,
  type SessionResponse,
} from "@/lib/server/sessionService";

vi.mock("@/lib/server/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/server/sessionService", () => ({
  getActiveSession: vi.fn(),
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
  status: "ACTIVE",
  startTime: "2026-11-09T15:00:00.000Z",
  endTime: "2026-11-09T15:25:00.000Z",
  lastHeartbeatAt: "2026-11-09T15:00:00.000Z",
  coinsEarned: 0,
  feedingMinutesEarned: 0,
  applesEarned: 0,
} satisfies SessionResponse;

function request(cookie?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request("http://localhost/api/sessions/active", { headers });
}

beforeEach(() => {
  vi.mocked(getAuthenticatedUser).mockReset();
  vi.mocked(getActiveSession).mockReset();
  vi.mocked(getAuthenticatedUser).mockResolvedValue(USER);
});

describe("GET /api/sessions/active route (US5, #13)", () => {
  it("returns the caller's active session without a completion token", async () => {
    vi.mocked(getActiveSession).mockResolvedValue(SESSION);

    const response = await getActiveSessionRoute(request("onyou_auth=token"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(SESSION);
    expect(body).not.toHaveProperty("sessionToken");
    expect(body).not.toHaveProperty("token");
    expect(response.headers.get("x-session-token")).toBeNull();
    expect(getActiveSession).toHaveBeenCalledWith(USER.id, expect.any(Date));
  });

  it("returns null when the account has no active session", async () => {
    vi.mocked(getActiveSession).mockResolvedValue(null);

    const response = await getActiveSessionRoute(request("onyou_auth=token"));

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("rejects an unauthenticated request before reading a session", async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Log in to continue."),
    );

    const response = await getActiveSessionRoute(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
    expect(getActiveSession).not.toHaveBeenCalled();
  });
});
