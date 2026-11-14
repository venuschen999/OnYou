// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionResult } from "@/components/SessionResult";
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

function completed(
  overrides: Partial<FocusSessionView> = {},
): FocusSessionView {
  return {
    id: "session_1",
    taskName: "Essay draft: intro",
    durationMinutes: 25,
    status: "COMPLETED",
    startTime: "2026-11-09T15:00:00.000Z",
    endTime: "2026-11-09T15:25:00.000Z",
    lastHeartbeatAt: "2026-11-09T15:24:50.000Z",
    coinsEarned: 25,
    feedingMinutesEarned: 15,
    applesEarned: 1,
    pet: {
      name: "Mochi",
      feedingState: "FULL",
      apples: 2,
      feedingMinutes: 50,
      minutesUntilNextApple: 0,
    },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("Session result screen (US6, #16)", () => {
  it("shows the server rewards, the full pet, and discarded minutes", () => {
    render(<SessionResult session={completed()} onStartAnother={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Session complete" }),
    ).toBeTruthy();
    expect(screen.getByText("Essay draft: intro, 25 minutes")).toBeTruthy();
    expect(screen.getByText("+25")).toBeTruthy();
    expect(screen.getByText("coins")).toBeTruthy();
    expect(screen.getByText("+15")).toBeTruthy();
    expect(screen.getByText("feeding minutes")).toBeTruthy();
    expect(screen.getByText("+1")).toBeTruthy();
    expect(screen.getByText("apple")).toBeTruthy();
    expect(screen.getByText("Full")).toBeTruthy();
    expect(screen.getByLabelText("Mochi is full")).toBeTruthy();
    expect(
      screen.getByText(
        "Mochi is full for today. 10 minutes went past the 50-minute daily limit, so they don’t count toward apples.",
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Back to dashboard" })
        .getAttribute("href"),
    ).toBe("/dashboard");
    expect(
      screen.getByRole("button", { name: "Start another session" }),
    ).toBeTruthy();
  });

  it("shows zero apples and the minutes still needed for the first apple", () => {
    render(
      <SessionResult
        session={completed({
          taskName: "Problem set 6",
          durationMinutes: 15,
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
        })}
        onStartAnother={vi.fn()}
      />,
    );

    expect(screen.getAllByText("+15")).toHaveLength(2);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("apples")).toBeTruthy();
    expect(screen.getByText("Starving")).toBeTruthy();
    expect(screen.getByLabelText("Mochi is starving")).toBeTruthy();
    expect(
      screen.getByText(
        "10 more minutes of focus today earns Mochi’s first apple.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("+25")).toBeNull();
  });

  it("shows coins only when the pet was already Full", () => {
    render(
      <SessionResult
        session={completed({
          taskName: "Lab report figures",
          durationMinutes: 50,
          coinsEarned: 50,
          feedingMinutesEarned: 0,
          applesEarned: 0,
          pet: {
            name: "Mochi",
            feedingState: "FULL",
            apples: 2,
            feedingMinutes: 50,
            minutesUntilNextApple: 0,
          },
        })}
        onStartAnother={vi.fn()}
      />,
    );

    expect(screen.getByText("+50")).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getByText("feeding minutes")).toBeTruthy();
    expect(screen.getByText("apples")).toBeTruthy();
    expect(screen.getByText("Full")).toBeTruthy();
    expect(screen.getByLabelText("Mochi is full")).toBeTruthy();
    expect(
      screen.getByText(
        "Mochi was already full today, so this session earns coins only. Apples start again at midnight.",
      ),
    ).toBeTruthy();
  });

  it("still shows rewards when the server omits the pet snapshot", () => {
    render(
      <SessionResult
        session={completed({ pet: undefined })}
        onStartAnother={vi.fn()}
      />,
    );

    expect(screen.getByText("+25")).toBeTruthy();
    expect(screen.getByText("+15")).toBeTruthy();
    expect(screen.getByText("+1")).toBeTruthy();
    expect(screen.queryByText("Full")).toBeNull();
    expect(screen.queryByText("Starving")).toBeNull();
    expect(screen.queryByText("Hungry")).toBeNull();
  });

  it("shows an abandoned session with no rewards and no second start", () => {
    render(
      <SessionResult
        session={completed({
          status: "ABANDONED",
          coinsEarned: 0,
          feedingMinutesEarned: 0,
          applesEarned: 0,
          pet: undefined,
        })}
        onStartAnother={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Session ended early" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Essay draft: intro, 25 minutes. The session was given up, or no OnYou tab was connected for 30 seconds.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(3);
    expect(screen.queryByText(/\+/)).toBeNull();
    expect(
      screen.getByText(
        "No rewards this time. Apples and coins from earlier sessions are unchanged.",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Mochi got slapped")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Start another session" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Back to dashboard" })
        .getAttribute("href"),
    ).toBe("/dashboard");
  });

  it("starts another session only when that action is chosen", () => {
    const onStartAnother = vi.fn();
    render(
      <SessionResult session={completed()} onStartAnother={onStartAnother} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Start another session" }),
    );

    expect(onStartAnother).toHaveBeenCalledTimes(1);
  });
});
