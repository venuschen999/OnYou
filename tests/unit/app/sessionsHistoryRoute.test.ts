import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listSessionsRoute } from "@/app/api/sessions/route";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { AppError } from "@/lib/server/errors";
import { listSessionHistory } from "@/lib/server/sessionService";

vi.mock("@/lib/server/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/server/sessionService", () => ({
  startSession: vi.fn(),
  listSessionHistory: vi.fn(),
}));

const USER = {
  id: "user_1",
  email: "jo@school.edu",
  timezone: "America/New_York",
};

const PAGE = {
  items: [
    {
      id: "session_2",
      taskName: "Essay draft: intro",
      date: "2026-11-09T16:00:00.000Z",
      durationMinutes: 25,
      outcome: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
    },
  ],
  nextCursor: null,
};

function request(query = "", cookie?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request(`http://localhost/api/sessions${query}`, {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.mocked(getAuthenticatedUser).mockReset();
  vi.mocked(listSessionHistory).mockReset();
  vi.mocked(getAuthenticatedUser).mockResolvedValue(USER);
});

describe("GET /api/sessions route (US8, #22)", () => {
  it("returns the authenticated account's history page", async () => {
    vi.mocked(listSessionHistory).mockResolvedValue(PAGE);

    const response = await listSessionsRoute(
      request("?cursor=session_1&limit=20", "onyou_auth=token"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(PAGE);
    expect(listSessionHistory).toHaveBeenCalledWith(
      USER.id,
      { cursor: "session_1", limit: 20 },
      expect.any(Date),
    );
  });

  it("uses a page size of 20 when limit is omitted", async () => {
    vi.mocked(listSessionHistory).mockResolvedValue(PAGE);

    const response = await listSessionsRoute(request("", "onyou_auth=token"));

    expect(response.status).toBe(200);
    expect(listSessionHistory).toHaveBeenCalledWith(
      USER.id,
      { limit: 20 },
      expect.any(Date),
    );
  });

  it("rejects an unauthenticated request before reading history", async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(
      new AppError("UNAUTHENTICATED", "Log in to continue."),
    );

    const response = await listSessionsRoute(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
    expect(listSessionHistory).not.toHaveBeenCalled();
  });

  it("rejects a page size other than 20 before reading history", async () => {
    const response = await listSessionsRoute(
      request("?limit=10", "onyou_auth=token"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fields: { limit: "History pages contain 20 sessions." },
      },
    });
    expect(listSessionHistory).not.toHaveBeenCalled();
  });
});
