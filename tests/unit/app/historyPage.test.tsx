// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "@/app/(app)/history/page";

const listSessionHistory = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/api/sessions", () => ({
  listSessionHistory,
}));

const NOW = new Date("2026-11-09T22:00:00.000Z");
const END_NOTE = "That’s every session. Your first one was on Mon Oct 19.";

const COMPLETED = {
  id: "session_new",
  taskName: "Essay draft: intro",
  date: "2026-11-09T20:00:00.000Z",
  durationMinutes: 25,
  outcome: "COMPLETED" as const,
  coinsEarned: 25,
  feedingMinutesEarned: 25,
};

const ABANDONED = {
  id: "session_mid",
  taskName: "Read chapter 4",
  date: "2026-11-09T16:10:00.000Z",
  durationMinutes: 50,
  outcome: "ABANDONED" as const,
  coinsEarned: 0,
  feedingMinutesEarned: 0,
};

const OLDEST = {
  id: "session_first",
  taskName: "Problem set 5",
  date: "2026-10-19T23:45:00.000Z",
  durationMinutes: 50,
  outcome: "COMPLETED" as const,
  coinsEarned: 50,
  feedingMinutesEarned: 50,
};

type HistoryPayload = {
  items: unknown[];
  nextCursor: string | null;
};

function page(
  items: unknown[],
  nextCursor: string | null = null,
): HistoryPayload {
  return { items, nextCursor };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  listSessionHistory.mockReset();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  const resolved = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(
    function mockZone(this: Intl.DateTimeFormat) {
      return { ...resolved.call(this), timeZone: "America/New_York" };
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("History page (US8, #23)", () => {
  it("shows a loading state while the first page is in flight", () => {
    listSessionHistory.mockReturnValue(new Promise(() => undefined));

    render(<HistoryPage />);

    expect(screen.getByText("Loading your sessions…")).toBeTruthy();
    expect(listSessionHistory).toHaveBeenCalledWith();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the empty state when the account has no sessions", async () => {
    listSessionHistory.mockResolvedValue(page([]));

    render(<HistoryPage />);

    expect(
      await screen.findByRole("heading", { name: "No sessions yet" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Start focusing" }).getAttribute("href"),
    ).toBe("/focus");
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("shows newest-first completed and abandoned sessions on a table that becomes cards", async () => {
    listSessionHistory.mockResolvedValue(page([ABANDONED, COMPLETED]));

    render(<HistoryPage />);

    const rows = await screen.findAllByRole("row");
    expect(screen.getByRole("columnheader", { name: "Task" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Duration" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Outcome" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Rewards" })).toBeTruthy();
    expect(rows[1]?.textContent).toContain("Essay draft: intro");
    expect(rows[1]?.textContent).toContain("Today, 3:00 PM");
    expect(rows[1]?.textContent).toContain("25 min");
    expect(rows[1]?.textContent).toContain("Completed");
    expect(rows[1]?.textContent).toContain("+25 coins");
    expect(rows[1]?.textContent).toContain("+25 feeding min");
    expect(rows[2]?.textContent).toContain("Read chapter 4");
    expect(rows[2]?.textContent).toContain("Abandoned");
    expect(rows[2]?.textContent).toContain("No rewards");
    expect(screen.getByRole("table").className).toContain("max-[600px]:block");
    expect(rows[1]?.className).toContain("max-[600px]:grid");
    expect(
      screen.getByText(
        "That’s every session. Your first one was on Mon Nov 9.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("loads the next cursor, shows a loading state, then the end note", async () => {
    const user = userEvent.setup();
    const next = deferred<HistoryPayload>();
    listSessionHistory.mockResolvedValueOnce(page([COMPLETED], "session_new"));
    listSessionHistory.mockImplementationOnce(() => next.promise);

    render(<HistoryPage />);
    await user.click(await screen.findByRole("button", { name: "Load more" }));

    const loading = screen.getByRole("button", {
      name: "Loading more sessions…",
    });
    expect(loading.getAttribute("aria-busy")).toBe("true");
    expect(loading.hasAttribute("disabled")).toBe(true);
    expect(listSessionHistory).toHaveBeenLastCalledWith("session_new");

    next.resolve(page([OLDEST]));
    expect(await screen.findByText(END_NOTE)).toBeTruthy();
    expect(screen.getByText("Problem set 5")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("shows an error and retries the first page", async () => {
    const user = userEvent.setup();
    listSessionHistory.mockRejectedValueOnce(new Error("offline"));
    listSessionHistory.mockResolvedValueOnce(page([COMPLETED]));

    render(<HistoryPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Couldn’t load the history screen",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "Check your internet connection and try again.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Essay draft: intro")).toBeTruthy();
    expect(listSessionHistory).toHaveBeenCalledTimes(2);
  });

  it("keeps loaded sessions when the next page fails so Load more can be tried again", async () => {
    const user = userEvent.setup();
    listSessionHistory.mockResolvedValueOnce(page([COMPLETED], "session_new"));
    listSessionHistory.mockRejectedValueOnce(new Error("offline"));
    listSessionHistory.mockResolvedValueOnce(page([OLDEST]));

    render(<HistoryPage />);
    await user.click(await screen.findByRole("button", { name: "Load more" }));

    expect(
      await screen.findByRole("button", { name: "Load more" }),
    ).toBeTruthy();
    expect(screen.getByText("Essay draft: intro")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText(END_NOTE)).toBeTruthy();
    expect(listSessionHistory).toHaveBeenLastCalledWith("session_new");
  });

  it("ignores a slower first page after a newer request", async () => {
    const first = deferred<HistoryPayload>();
    const second = deferred<HistoryPayload>();
    listSessionHistory.mockImplementationOnce(() => first.promise);
    listSessionHistory.mockImplementationOnce(() => second.promise);

    render(
      <StrictMode>
        <HistoryPage />
      </StrictMode>,
    );
    await vi.waitFor(() => expect(listSessionHistory).toHaveBeenCalledTimes(2));

    second.resolve(page([COMPLETED]));
    expect(await screen.findByText("Essay draft: intro")).toBeTruthy();
    first.resolve(page([ABANDONED]));
    await Promise.resolve();
    expect(screen.queryByText("Read chapter 4")).toBeNull();
  });
});
