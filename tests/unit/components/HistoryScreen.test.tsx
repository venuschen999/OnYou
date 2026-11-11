// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryScreen, type HistoryEntry } from "@/components/HistoryScreen";

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

const NOW = "2026-11-09T22:00:00.000Z";
const TIME_ZONE = "America/New_York";

const COMPLETED: HistoryEntry = {
  id: "session_new",
  taskName: "Essay draft: intro",
  startedAt: "2026-11-09T20:00:00.000Z",
  durationMinutes: 25,
  outcome: "COMPLETED",
  coinsEarned: 25,
  feedingMinutesEarned: 25,
};

const ABANDONED: HistoryEntry = {
  id: "session_old",
  taskName: "Read chapter 4",
  startedAt: "2026-11-09T16:10:00.000Z",
  durationMinutes: 50,
  outcome: "ABANDONED",
  coinsEarned: 50,
  feedingMinutesEarned: 50,
};

const OLDEST: HistoryEntry = {
  id: "session_first",
  taskName: "Problem set 5",
  startedAt: "2026-10-19T23:45:00.000Z",
  durationMinutes: 50,
  outcome: "COMPLETED",
  coinsEarned: 50,
  feedingMinutesEarned: 50,
};

function ready(
  entries: HistoryEntry[],
  options: { hasMore?: boolean; isLoadingMore?: boolean } = {},
) {
  const onLoadMore = vi.fn();
  render(
    <HistoryScreen
      phase="ready"
      entries={entries}
      hasMore={options.hasMore ?? false}
      isLoadingMore={options.isLoadingMore ?? false}
      timeZone={TIME_ZONE}
      now={NOW}
      onLoadMore={onLoadMore}
    />,
  );
  return onLoadMore;
}

afterEach(() => {
  cleanup();
});

describe("History screen (US8, #23)", () => {
  it("shows completed rewards and abandoned sessions as No rewards", () => {
    ready([ABANDONED, COMPLETED]);

    expect(
      screen.getByRole("heading", { name: "Your sessions" }),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Task" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Duration" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Outcome" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Rewards" })).toBeTruthy();
    const rows = screen.getAllByRole("row");
    expect(rows[1]?.textContent).toContain("Essay draft: intro");
    expect(rows[1]?.textContent).toContain("Today, 3:00 PM");
    expect(rows[1]?.textContent).toContain("25 min");
    expect(rows[1]?.textContent).toContain("Completed");
    expect(rows[1]?.textContent).toContain("+25 coins");
    expect(rows[1]?.textContent).toContain("+25 feeding min");
    expect(rows[2]?.textContent).toContain("Read chapter 4");
    expect(rows[2]?.textContent).toContain("Abandoned");
    expect(rows[2]?.textContent).toContain("No rewards");
    expect(rows[2]?.textContent).not.toContain("+50");
    expect(screen.getByRole("table").className).toContain("max-[600px]:block");
    expect(screen.getAllByRole("row")[1]?.className).toContain(
      "max-[600px]:grid",
    );
  });

  it("shows the empty state and a Start focusing action", () => {
    ready([]);

    expect(
      screen.getByRole("heading", { name: "No sessions yet" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Finished and abandoned sessions show up here."),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: "Mochi is waiting" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Start focusing" }).getAttribute("href"),
    ).toBe("/focus");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("loads another page and then replaces Load more with the end note", async () => {
    const user = userEvent.setup();
    const onLoadMore = ready([COMPLETED], { hasMore: true });

    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMore).toHaveBeenCalledOnce();

    cleanup();
    ready([COMPLETED], { hasMore: true, isLoadingMore: true });
    const loading = screen.getByRole("button", {
      name: "Loading more sessions…",
    });
    expect(loading.hasAttribute("disabled")).toBe(true);
    expect(loading.getAttribute("aria-busy")).toBe("true");

    cleanup();
    ready([COMPLETED, OLDEST], { hasMore: false });
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(
      screen.getByText(
        "That’s every session. Your first one was on Mon Oct 19.",
      ),
    ).toBeTruthy();
  });

  it("shows a loading state before any sessions", () => {
    render(<HistoryScreen phase="loading" />);

    expect(screen.getByText("Loading your sessions…")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading", { name: "No sessions yet" })).toBeNull();
  });

  it("shows an error state with Try again", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<HistoryScreen phase="error" onRetry={onRetry} />);

    expect(
      screen.getByRole("heading", { name: "Couldn’t load the history screen" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("alert").textContent,
    ).toContain("Check your internet connection and try again.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
