import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeSession, type FocusSessionView } from "@/lib/api/sessions";

const fetchMock = vi.fn<typeof fetch>();

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
} satisfies FocusSessionView;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("lib/api/sessions completeSession (#15)", () => {
  it("posts completion with no body so the client cannot send rewards", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, SESSION));

    await expect(completeSession("session_1")).resolves.toEqual(SESSION);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/sessions/session_1/complete");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });
});
