// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "@/components/LogoutButton";
import { SessionPresence } from "@/components/SessionPresence";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: vi.fn() }),
  usePathname: () => "/settings",
}));

const NOW = new Date("2026-11-15T15:00:00.000Z");
const RUNNING = {
  id: "session_1",
  taskName: "Essay draft: intro",
  durationMinutes: 25,
  status: "ACTIVE",
  startTime: NOW.toISOString(),
  endTime: new Date(NOW.getTime() + 25 * 60_000).toISOString(),
  lastHeartbeatAt: NOW.toISOString(),
  coinsEarned: 0,
  feedingMinutesEarned: 0,
  applesEarned: 0,
};
const CONFIRM_COPY =
  "“Essay draft: intro” is still running. Logging out ends it on every device, and Mochi gets nothing from it.";

let activeSession: typeof RUNNING | null = null;
const fetchMock = vi.fn(async (url: string) => {
  const path = String(url);
  if (path === "/api/sessions/active") return json(activeSession);
  if (path.endsWith("/heartbeat")) return json(activeSession);
  if (path === "/api/auth/logout") return json({ message: "Logged out." });
  throw new Error(`unexpected fetch ${path}`);
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function logoutCalls(): number {
  return fetchMock.mock.calls.filter(([url]) => url === "/api/auth/logout")
    .length;
}

async function renderButton(): Promise<HTMLElement> {
  render(
    <SessionPresence>
      <LogoutButton />
    </SessionPresence>,
  );
  await vi.waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sessions/active",
      expect.anything(),
    ),
  );
  return screen.findByRole("button", { name: "Log out" });
}

beforeEach(() => {
  activeSession = null;
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(Storage.prototype, "getItem");
  vi.spyOn(Storage.prototype, "setItem");
  vi.spyOn(Storage.prototype, "removeItem");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fetchMock.mockClear();
  replaceMock.mockReset();
});

describe("Log out (US1, #18)", () => {
  it("shows the hint that logging out ends a running session", async () => {
    await renderButton();

    expect(
      screen.getByText("Logging out during a session ends that session."),
    ).toBeInTheDocument();
  });

  it("logs out at once and goes to login when no session is running", async () => {
    const user = userEvent.setup();
    const button = await renderButton();

    await user.click(button);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await vi.waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(logoutCalls()).toBe(1);
  });

  it("asks for confirmation with the mockup copy when a session is running", async () => {
    activeSession = RUNNING;
    const user = userEvent.setup();
    const button = await renderButton();
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => u.endsWith("/heartbeat"))).toBe(
        true,
      ),
    );

    await user.click(button);

    const dialog = screen.getByRole("dialog", {
      name: "Log out and end this session?",
    });
    expect(within(dialog).getByText(CONFIRM_COPY)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Log out and end session" }),
    ).toBeInTheDocument();
    expect(logoutCalls()).toBe(0);
  });

  it("ends the session, logs out, and goes to login on confirm", async () => {
    activeSession = RUNNING;
    const user = userEvent.setup();
    const button = await renderButton();
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => u.endsWith("/heartbeat"))).toBe(
        true,
      ),
    );

    await user.click(button);
    await user.click(
      screen.getByRole("button", { name: "Log out and end session" }),
    );

    await vi.waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(logoutCalls()).toBe(1);
  });

  it("changes nothing on Stay logged in or Escape, and returns focus to Log out", async () => {
    activeSession = RUNNING;
    const user = userEvent.setup();
    const button = await renderButton();
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => u.endsWith("/heartbeat"))).toBe(
        true,
      ),
    );

    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Stay logged in" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button);

    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(button);

    expect(logoutCalls()).toBe(0);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("never reads or clears a sessionStorage or localStorage token", async () => {
    activeSession = RUNNING;
    const user = userEvent.setup();
    const button = await renderButton();
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => u.endsWith("/heartbeat"))).toBe(
        true,
      ),
    );

    await user.click(button);
    await user.click(
      screen.getByRole("button", { name: "Log out and end session" }),
    );
    await vi.waitFor(() => expect(replaceMock).toHaveBeenCalled());

    expect(Storage.prototype.getItem).not.toHaveBeenCalled();
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
    expect(Storage.prototype.removeItem).not.toHaveBeenCalled();
  });
});
