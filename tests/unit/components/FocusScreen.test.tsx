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
import { formatEndClock } from "@/lib/domain/countdown";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/domain/presence";

const navigation = vi.hoisted(() => ({ pathname: "/focus" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

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
const END = new Date("2026-11-09T15:25:00.000Z");
const KEEP_OPEN =
  "Keep at least one OnYou tab open until the timer ends. Switching tabs or apps is fine. If no OnYou tab is connected for 30 seconds, the session ends without rewards.";
const CONNECTION_WARNING =
  "Can’t reach OnYou. Check your internet connection. If it stays down for about 30 seconds, this session ends without rewards.";

type SessionBody = {
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
};

function session(overrides: Partial<SessionBody> = {}): SessionBody {
  return {
    id: "session_1",
    taskName: "Essay draft: intro",
    durationMinutes: 25,
    status: "ACTIVE",
    startTime: NOW.toISOString(),
    endTime: END.toISOString(),
    lastHeartbeatAt: NOW.toISOString(),
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
    ...overrides,
  };
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
  promise: Promise<Response>;
};

const requests: Pending[] = [];

function deferredResponse(): Pick<Pending, "resolve" | "reject" | "promise"> {
  let resolve: (response: Response) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<Response>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { resolve, reject, promise };
}

function installFetch(): void {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const pending = deferredResponse();
      requests.push({ url: String(url), init, ...pending });
      return pending.promise;
    }),
  );
}

async function settle(index: number, response: Response): Promise<void> {
  const pending = requests[index];
  if (!pending) throw new Error(`missing request ${index}`);
  await act(async () => {
    pending.resolve(response);
    await pending.promise;
  });
}

function requestUrl(index: number): string {
  return requests[index]?.url ?? "";
}

function requestBody(index: number): unknown {
  const raw = requests[index]?.init?.body;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function alertText(): string {
  return screen
    .getAllByRole("alert")
    .map((node) => node.textContent?.replace(/\s+/g, " ").trim() ?? "")
    .join(" ");
}

function renderFocus(): void {
  render(
    <SessionPresence>
      <FocusScreen />
    </SessionPresence>,
  );
}

async function loadEmpty(): Promise<void> {
  renderFocus();
  expect(screen.getByText("Loading your session…")).toBeTruthy();
  await settle(0, jsonResponse(null));
}

beforeEach(() => {
  navigation.pathname = "/focus";
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
  vi.spyOn(Storage.prototype, "getItem");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Focus screen setup (US5, #13)", () => {
  it("offers 15, 25, and 50 minutes and names the selected duration", async () => {
    await loadEmpty();

    expect(
      screen.getByRole("heading", { name: "What are you working on?" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Task")).toBeTruthy();
    expect(screen.getByText("Optional. Up to 80 characters.")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "15 minutes" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "25 minutes" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "50 minutes" })).toBeTruthy();
    expect(
      (screen.getByRole("radio", { name: "25 minutes" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Start 25 minutes" }),
    ).toBeTruthy();
    expect(screen.getByText(KEEP_OPEN)).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "15 minutes" }));
    expect(
      screen.getByRole("button", { name: "Start 15 minutes" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "50 minutes" }));
    expect(
      screen.getByRole("button", { name: "Start 50 minutes" }),
    ).toBeTruthy();
  });

  it("shows a field error and disables Start when the task is over 80 characters", async () => {
    await loadEmpty();
    const task = "a".repeat(81);

    fireEvent.change(screen.getByLabelText("Task"), {
      target: { value: task },
    });

    expect(
      screen.getByText(
        "Task names can be up to 80 characters. This one has 81.",
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Start 25 minutes",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      requests.filter((entry) => entry.init?.method === "POST"),
    ).toHaveLength(0);
  });

  it("starts one session and counts down from the server endTime", async () => {
    await loadEmpty();
    fireEvent.change(screen.getByLabelText("Task"), {
      target: { value: "Essay draft: intro" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "25 minutes" }));
    fireEvent.click(screen.getByRole("button", { name: "Start 25 minutes" }));
    fireEvent.click(screen.getByRole("button", { name: "Start 25 minutes" }));

    const posts = requests.filter((entry) => entry.init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]?.url).toContain("/api/sessions");
    expect(posts[0]?.url).not.toContain("heartbeat");
    expect(requestBody(requests.indexOf(posts[0]!))).toEqual({
      taskName: "Essay draft: intro",
      durationMinutes: 25,
    });
    expect(
      new Headers(posts[0]?.init?.headers).get("x-session-token"),
    ).toBeNull();

    await settle(requests.indexOf(posts[0]!), jsonResponse(session(), 201));

    expect(screen.getByText("25:00")).toBeTruthy();
    expect(screen.getByText("Essay draft: intro")).toBeTruthy();
    const endClock = formatEndClock(
      END,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(screen.getByText(`25 minutes, ends at ${endClock}`)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Give up" })).toBeTruthy();
    expect(
      screen.getByText(/This session shows in every OnYou tab/),
    ).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("24:59")).toBeTruthy();

    await act(async () => {
      vi.setSystemTime(new Date(NOW.getTime() + 89_000));
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("23:30")).toBeTruthy();
    expect(screen.queryByText("Completed")).toBeNull();
    expect(screen.queryByText("Abandoned")).toBeNull();
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
  });

  it("joins the existing session after a 409 instead of starting another", async () => {
    await loadEmpty();
    fireEvent.click(screen.getByRole("button", { name: "Start 25 minutes" }));
    const startIndex = requests.findIndex(
      (entry) => entry.init?.method === "POST",
    );
    await settle(
      startIndex,
      jsonResponse(
        {
          error: {
            code: "ACTIVE_SESSION_EXISTS",
            message: "One session at a time",
          },
        },
        409,
      ),
    );

    const followUp = requests.findIndex(
      (entry, index) =>
        index > startIndex && entry.url.includes("/api/sessions/active"),
    );
    expect(followUp).toBeGreaterThan(startIndex);
    await settle(
      followUp,
      jsonResponse(session({ taskName: "Already running" })),
    );

    expect(screen.getByText("Already running")).toBeTruthy();
    expect(
      requests.filter(
        (entry) =>
          entry.init?.method === "POST" && !entry.url.includes("heartbeat"),
      ),
    ).toHaveLength(1);
  });

  it("shows the login error on 401 and the connection warning on a network failure", async () => {
    await loadEmpty();
    fireEvent.click(screen.getByRole("button", { name: "Start 25 minutes" }));
    const startIndex = requests.findIndex(
      (entry) => entry.init?.method === "POST",
    );
    await settle(
      startIndex,
      jsonResponse(
        { error: { code: "UNAUTHENTICATED", message: "Log in to continue." } },
        401,
      ),
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Log in to continue.",
    );
    expect(screen.queryByText(/Can’t reach OnYou/)).toBeNull();
    expect(screen.queryByText("Completed")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start 25 minutes" }));
    const networkIndex = requests.findIndex(
      (entry, index) => index > startIndex && entry.init?.method === "POST",
    );
    await act(async () => {
      requests[networkIndex]?.reject(new TypeError("offline"));
    });

    expect(alertText()).toContain(CONNECTION_WARNING);
    expect(screen.queryByText("Abandoned")).toBeNull();
  });
});

describe("Focus screen restore and heartbeats (US5, #13)", () => {
  it("restores the active session after refresh and does not start a new one", async () => {
    renderFocus();
    expect(requestUrl(0)).toContain("/api/sessions/active");
    await settle(0, jsonResponse(session()));

    expect(screen.getByText("Essay draft: intro")).toBeTruthy();
    expect(screen.getByText("25:00")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Give up" })).toBeTruthy();
    expect(
      requests.filter(
        (entry) =>
          entry.init?.method === "POST" && !entry.url.includes("heartbeat"),
      ),
    ).toHaveLength(0);
    expect(screen.getByLabelText("Mochi is waiting")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Give up" }));
    expect(requests.some((entry) => entry.url.includes("/abandon"))).toBe(
      false,
    );
  });

  it("sends a heartbeat on join and every 10 seconds without overlapping", async () => {
    renderFocus();
    await settle(0, jsonResponse(session()));

    const heartbeat = () =>
      requests.filter((entry) => entry.url.includes("/heartbeat"));
    expect(heartbeat()).toHaveLength(1);
    await settle(requests.indexOf(heartbeat()[0]!), jsonResponse(session()));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS - 1000);
    });
    expect(heartbeat()).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(heartbeat()).toHaveLength(2);
    expect(heartbeat()[1]?.init?.method).toBe("POST");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3);
    });
    expect(heartbeat()).toHaveLength(2);
  });

  it("keeps heartbeats running when the focus screen unmounts and stops on cleanup", async () => {
    const view = render(
      <SessionPresence>
        <FocusScreen />
      </SessionPresence>,
    );
    await settle(0, jsonResponse(session()));
    const firstHeartbeat = requests.findIndex((entry) =>
      entry.url.includes("/heartbeat"),
    );
    await settle(firstHeartbeat, jsonResponse(session()));
    const heartbeatsBefore = requests.filter((entry) =>
      entry.url.includes("/heartbeat"),
    ).length;

    view.rerender(
      <SessionPresence>
        <p>Home</p>
      </SessionPresence>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);
    });
    const heartbeatsAfterNavigation = requests.filter((entry) =>
      entry.url.includes("/heartbeat"),
    ).length;
    expect(heartbeatsAfterNavigation).toBeGreaterThan(heartbeatsBefore);

    view.unmount();
    const settled = requests.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 2);
    });
    expect(requests).toHaveLength(settled);
  });

  it("lets two mounted presences heartbeat the same session", async () => {
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
    const activeReads = requests
      .map((entry, index) => ({ entry, index }))
      .filter((item) => item.entry.url.includes("/api/sessions/active"));
    expect(activeReads).toHaveLength(2);
    await settle(activeReads[0]!.index, jsonResponse(session()));
    await settle(activeReads[1]!.index, jsonResponse(session()));

    expect(screen.getAllByText("Essay draft: intro")).toHaveLength(2);
    expect(
      requests.filter((entry) => entry.url.includes("/heartbeat")),
    ).toHaveLength(2);
  });

  it("ignores a stale active-session response after start wins", async () => {
    await loadEmpty();
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const staleGet = requests.findIndex(
      (entry, index) => index > 0 && entry.url.includes("/api/sessions/active"),
    );
    expect(staleGet).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Start 25 minutes" }));
    const startIndex = requests.findIndex(
      (entry) => entry.init?.method === "POST",
    );
    await settle(
      startIndex,
      jsonResponse(session({ taskName: "Newer task" }), 201),
    );
    expect(screen.getByText("Newer task")).toBeTruthy();

    await settle(staleGet, jsonResponse(null));
    expect(screen.getByText("Newer task")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Start 25 minutes" }),
    ).toBeNull();
  });

  it("shows the connection warning when a heartbeat fails and keeps the session", async () => {
    renderFocus();
    await settle(0, jsonResponse(session()));
    const heartbeatIndex = requests.findIndex((entry) =>
      entry.url.includes("/heartbeat"),
    );
    await act(async () => {
      requests[heartbeatIndex]?.reject(new TypeError("offline"));
    });

    expect(alertText()).toContain(CONNECTION_WARNING);
    expect(screen.getByText("Essay draft: intro")).toBeTruthy();
    expect(screen.queryByText("Abandoned")).toBeNull();
    expect(screen.queryByText("Completed")).toBeNull();
  });

  it("shows the active session bar on other screens", async () => {
    navigation.pathname = "/";
    render(
      <SessionPresence>
        <p>Home</p>
      </SessionPresence>,
    );
    await settle(0, jsonResponse(session()));

    expect(screen.getByRole("status").textContent).toContain(
      "Essay draft: intro",
    );
    expect(screen.getByRole("status").textContent).toContain("is running");
    expect(
      screen
        .getByRole("link", { name: "Return to session" })
        .getAttribute("href"),
    ).toBe("/focus");
  });
});
