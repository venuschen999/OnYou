// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusScreen } from "@/components/FocusScreen";
import { SessionPresence } from "@/components/SessionPresence";
import type { FocusSessionView } from "@/lib/api/sessions";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const NOW = new Date("2026-11-09T15:00:00.000Z");
const END_DELAY_MS = 1000;
const CONNECTION_WARNING =
  "Can’t reach OnYou. Check your internet connection. If it stays down for about 30 seconds, this session ends without rewards.";

function session(overrides: Partial<FocusSessionView> = {}): FocusSessionView {
  return {
    id: "session_1",
    taskName: "Essay draft: intro",
    durationMinutes: 25,
    status: "ACTIVE",
    startTime: NOW.toISOString(),
    endTime: new Date(NOW.getTime() + END_DELAY_MS).toISOString(),
    lastHeartbeatAt: NOW.toISOString(),
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
    ...overrides,
  };
}

function completedBody(
  overrides: Partial<FocusSessionView> = {},
): FocusSessionView {
  return session({
    status: "COMPLETED",
    coinsEarned: 15,
    feedingMinutesEarned: 15,
    applesEarned: 0,
    pet: {
      name: "Mochi",
      feedingState: "STARVING",
      apples: 0,
      feedingMinutes: 15,
      minutesUntilNextApple: 10,
    },
    ...overrides,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type Pending = {
  url: string;
  init?: RequestInit;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
};

const requests: Pending[] = [];

function installFetch(): void {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      let resolve: (response: Response) => void = () => undefined;
      let reject: (error: unknown) => void = () => undefined;
      const promise = new Promise<Response>((done, fail) => {
        resolve = done;
        reject = fail;
      });
      requests.push({ url: String(url), init, resolve, reject });
      return promise;
    }),
  );
}

async function settle(index: number, response: Response): Promise<void> {
  const pending = requests[index];
  if (!pending) throw new Error(`missing request ${index}`);
  await act(async () => {
    pending.resolve(response);
  });
}

function completeIndexes(): number[] {
  return requests.flatMap((entry, index) =>
    entry.url.includes("/complete") ? [index] : [],
  );
}

function startPosts(): Pending[] {
  return requests.filter(
    (entry) =>
      entry.init?.method === "POST" &&
      entry.url.endsWith("/api/sessions") &&
      !entry.url.includes("/complete") &&
      !entry.url.includes("/heartbeat"),
  );
}

function renderFocus(): ReturnType<typeof render> {
  return render(
    <SessionPresence>
      <FocusScreen />
    </SessionPresence>,
  );
}

async function showActive(
  body: FocusSessionView = session(),
): Promise<ReturnType<typeof render>> {
  const view = renderFocus();
  await settle(0, jsonResponse(body));
  return view;
}

async function reachEnd(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(END_DELAY_MS);
  });
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
    ],
  });
  vi.setSystemTime(NOW);
  installFetch();
  vi.spyOn(Storage.prototype, "setItem");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Focus completion (US6, #16)", () => {
  it("requests completion once when the countdown reaches zero and shows the server rewards", async () => {
    await showActive();
    expect(completeIndexes()).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(END_DELAY_MS - 1);
    });
    expect(completeIndexes()).toHaveLength(0);
    expect(screen.queryByText("Finishing your session…")).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(screen.getByText("Finishing your session…")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
    const index = completeIndexes()[0];
    expect(index).toBeGreaterThan(0);
    const pending = requests[index];
    expect(pending?.init?.method).toBe("POST");
    expect(pending?.init?.body).toBeUndefined();
    expect(
      new Headers(pending?.init?.headers).get("x-session-token"),
    ).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(END_DELAY_MS);
    });
    expect(completeIndexes()).toHaveLength(1);

    await settle(index!, jsonResponse(completedBody()));

    expect(
      screen.getByRole("heading", { name: "Session complete" }),
    ).toBeTruthy();
    expect(screen.getAllByText("+15")).toHaveLength(2);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("apples")).toBeTruthy();
    expect(screen.getByText("Starving")).toBeTruthy();
    expect(
      screen.getByText(
        "10 more minutes of focus today earns Mochi’s first apple.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("+25")).toBeNull();
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
    expect(startPosts()).toHaveLength(0);
  });

  it("retries a too-early completion after the scheduled end and then shows the result", async () => {
    await showActive();
    await reachEnd();
    const first = completeIndexes()[0];
    expect(first).toBeGreaterThanOrEqual(0);

    await settle(
      first!,
      jsonResponse(
        {
          error: {
            code: "SESSION_TOO_EARLY",
            message: "This session has not reached its scheduled end.",
          },
        },
        409,
      ),
    );

    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
    expect(screen.getByText("Finishing your session…")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(completeIndexes()).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(completeIndexes()).toHaveLength(2);
    await settle(completeIndexes()[1]!, jsonResponse(completedBody()));

    expect(
      screen.getByRole("heading", { name: "Session complete" }),
    ).toBeTruthy();
  });

  it("shows an abandoned session without rewards", async () => {
    await showActive();
    await reachEnd();
    await settle(
      completeIndexes()[0]!,
      jsonResponse(
        {
          error: {
            code: "SESSION_ABANDONED",
            message: "This session was abandoned and cannot be completed.",
          },
        },
        409,
      ),
    );

    expect(
      screen.getByRole("heading", { name: "Session ended early" }),
    ).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.queryByText(/\+/)).toBeNull();
    expect(
      screen.getByText(
        "No rewards this time. Apples and coins from earlier sessions are unchanged.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Start another session" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
  });

  it("shows authentication, forbidden, and missing-session errors", async () => {
    await showActive();
    await reachEnd();
    await settle(
      completeIndexes()[0]!,
      jsonResponse(
        { error: { code: "UNAUTHENTICATED", message: "Log in to continue." } },
        401,
      ),
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Log in to continue.",
    );
    expect(
      screen.getByRole("link", { name: "Log in" }).getAttribute("href"),
    ).toBe("/login");
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
    expect(completeIndexes()).toHaveLength(1);

    cleanup();
    installFetch();
    await showActive();
    await reachEnd();
    await settle(
      completeIndexes()[0]!,
      jsonResponse(
        {
          error: {
            code: "FORBIDDEN",
            message: "That session belongs to another account.",
          },
        },
        403,
      ),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "That session belongs to another account.",
    );
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();

    cleanup();
    installFetch();
    await showActive();
    await reachEnd();
    await settle(
      completeIndexes()[0]!,
      jsonResponse(
        {
          error: {
            code: "SESSION_NOT_FOUND",
            message: "No session exists with that id.",
          },
        },
        404,
      ),
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "No session exists with that id.",
    );
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
  });

  it("shows a network failure and retries without marking the session complete", async () => {
    await showActive();
    await reachEnd();
    const first = completeIndexes()[0]!;
    await act(async () => {
      requests[first]?.reject(new TypeError("offline"));
    });

    expect(screen.getByRole("alert").textContent).toContain(CONNECTION_WARNING);
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(completeIndexes()).toHaveLength(2);
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
  });

  it("keeps one completion request in flight from a tab", async () => {
    await showActive();
    await reachEnd();
    expect(completeIndexes()).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(completeIndexes()).toHaveLength(1);
  });

  it("stops heartbeats after the server confirms completion", async () => {
    await showActive();
    const heartbeat = requests.findIndex((entry) =>
      entry.url.includes("/heartbeat"),
    );
    await settle(heartbeat, jsonResponse(session()));
    await reachEnd();
    await settle(completeIndexes()[0]!, jsonResponse(completedBody()));
    const heartbeats = requests.filter((entry) =>
      entry.url.includes("/heartbeat"),
    ).length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(
      requests.filter((entry) => entry.url.includes("/heartbeat")),
    ).toHaveLength(heartbeats);
  });

  it("ignores a stale active response after completion is confirmed", async () => {
    await showActive();
    const heartbeat = requests.findIndex((entry) =>
      entry.url.includes("/heartbeat"),
    );
    await reachEnd();
    await settle(completeIndexes()[0]!, jsonResponse(completedBody()));
    expect(
      screen.getByRole("heading", { name: "Session complete" }),
    ).toBeTruthy();

    await settle(
      heartbeat,
      jsonResponse(session({ taskName: "Stale active" })),
    );

    expect(
      screen.getByRole("heading", { name: "Session complete" }),
    ).toBeTruthy();
    expect(screen.queryByText("Stale active")).toBeNull();
    expect(screen.queryByRole("button", { name: "Give up" })).toBeNull();
  });

  it("keeps the confirmed result when a newer active read returns null", async () => {
    await showActive();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const stale = requests.findIndex(
      (entry, index) => index > 0 && entry.url.includes("/api/sessions/active"),
    );
    await reachEnd();
    await settle(stale, jsonResponse(null));
    expect(screen.getByText("Finishing your session…")).toBeTruthy();

    await settle(completeIndexes()[0]!, jsonResponse(completedBody()));
    expect(
      screen.getByRole("heading", { name: "Session complete" }),
    ).toBeTruthy();
  });

  it("returns to the task form for another session without creating one", async () => {
    await showActive();
    await reachEnd();
    await settle(completeIndexes()[0]!, jsonResponse(completedBody()));

    fireEvent.click(
      screen.getByRole("button", { name: "Start another session" }),
    );

    expect(
      screen.getByRole("heading", { name: "What are you working on?" }),
    ).toBeTruthy();
    expect(completeIndexes()).toHaveLength(1);
    expect(startPosts()).toHaveLength(0);
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
  });

  it("keeps a confirmed result across navigation away and back", async () => {
    const view = await showActive();
    await reachEnd();
    await settle(completeIndexes()[0]!, jsonResponse(completedBody()));

    view.rerender(
      <SessionPresence>
        <p>Home</p>
      </SessionPresence>,
    );
    expect(
      screen.queryByRole("heading", { name: "Session complete" }),
    ).toBeNull();
    expect(screen.getByText("Home")).toBeTruthy();

    view.rerender(
      <SessionPresence>
        <FocusScreen />
      </SessionPresence>,
    );
    expect(
      screen.getByRole("heading", { name: "Session complete" }),
    ).toBeTruthy();
    expect(completeIndexes()).toHaveLength(1);
  });

  it("does not complete or start a session again when refresh finds none", async () => {
    const view = await showActive();
    await reachEnd();
    await settle(completeIndexes()[0]!, jsonResponse(completedBody()));
    const completes = completeIndexes().length;

    view.unmount();
    renderFocus();
    const active = requests.findIndex(
      (entry, index) =>
        index > 0 &&
        entry.url.includes("/api/sessions/active") &&
        entry.init?.method !== "POST",
    );
    await settle(active, jsonResponse(null));

    expect(
      screen.getByRole("heading", { name: "What are you working on?" }),
    ).toBeTruthy();
    expect(completeIndexes()).toHaveLength(completes);
    expect(startPosts()).toHaveLength(0);
  });

  it("completes a restored session that is already due without starting another", async () => {
    renderFocus();
    await settle(0, jsonResponse(session({ endTime: NOW.toISOString() })));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(completeIndexes()).toHaveLength(1);
    expect(startPosts()).toHaveLength(0);
    expect(requests[completeIndexes()[0]!]?.init?.body).toBeUndefined();
  });

  it("lets two tabs complete the same session without a second request in either tab", async () => {
    render(
      <>
        <SessionPresence>
          <FocusScreen />
        </SessionPresence>
        <SessionPresence>
          <FocusScreen />
        </SessionPresence>
      </>,
    );
    const active = requests.flatMap((entry, index) =>
      entry.url.includes("/api/sessions/active") ? [index] : [],
    );
    expect(active).toHaveLength(2);
    await settle(active[0]!, jsonResponse(session()));
    await settle(active[1]!, jsonResponse(session()));
    await reachEnd();

    expect(completeIndexes()).toHaveLength(2);
    await settle(completeIndexes()[0]!, jsonResponse(completedBody()));
    await settle(completeIndexes()[1]!, jsonResponse(completedBody()));

    expect(
      screen.getAllByRole("heading", { name: "Session complete" }),
    ).toHaveLength(2);
    expect(screen.getAllByText("+15").length).toBeGreaterThanOrEqual(2);
    expect(startPosts()).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(completeIndexes()).toHaveLength(2);
  });

  it("does not complete after the provider unmounts", async () => {
    const view = await showActive();
    view.unmount();
    const before = requests.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(END_DELAY_MS * 5);
    });

    expect(requests).toHaveLength(before);
    expect(completeIndexes()).toHaveLength(0);
  });
});
