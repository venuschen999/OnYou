import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listSessionHistory } from "@/lib/api/sessions";

const fetchMock = vi.fn<typeof fetch>();

const EMPTY_PAGE = { items: [], nextCursor: null };

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
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

describe("listSessionHistory (US8, #23)", () => {
  it("gets the first page from GET /api/sessions", async () => {
    fetchMock.mockResolvedValue(jsonResponse(EMPTY_PAGE));

    await expect(listSessionHistory()).resolves.toEqual(EMPTY_PAGE);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("/api/sessions");
    expect(init?.method).toBeUndefined();
  });

  it("sends the cursor when loading another page", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], nextCursor: "session_01" }),
    );

    await listSessionHistory("session_20");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/sessions?cursor=session_20",
    );
  });
});
