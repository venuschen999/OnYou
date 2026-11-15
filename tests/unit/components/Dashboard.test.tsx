// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActiveSessionBar } from "@/components/ActiveSessionBar";
import {
  DashboardError,
  DashboardLoading,
  DashboardView,
} from "@/components/DashboardView";
import { FeedingProgress } from "@/components/FeedingProgress";
import { PetCard } from "@/components/PetCard";
import { formatEndClock } from "@/lib/domain/countdown";
import type { FocusSessionView } from "@/lib/api/sessions";
import { fullPet, hungryPet, starvingPet } from "../../fixtures/petProgress";

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

const NOW = new Date("2026-11-09T15:06:18.000Z");
const END = new Date("2026-11-09T15:25:00.000Z");

function activeSession(): FocusSessionView {
  return {
    id: "session_1",
    taskName: "Essay draft: intro",
    durationMinutes: 25,
    status: "ACTIVE",
    startTime: "2026-11-09T15:00:00.000Z",
    endTime: END.toISOString(),
    lastHeartbeatAt: "2026-11-09T15:06:18.000Z",
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
  };
}

function petSvg(name: string): string {
  const art = screen.getByRole("img", { name });
  return art.innerHTML;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PetCard (US3, US4, #20)", () => {
  it("shows the starving pet, its name, the text label, coins, and no apples", () => {
    render(<PetCard pet={starvingPet} />);

    expect(screen.getByRole("img", { name: "Mochi is starving" })).toBeTruthy();
    expect(petSvg("Mochi is starving")).toContain("q-5 8 0 10");
    expect(screen.getByText("Mochi")).toBeTruthy();
    expect(screen.getByText("Starving")).toBeTruthy();
    expect(
      document
        .querySelector("[data-pet-state]")
        ?.getAttribute("data-pet-state"),
    ).toBe("starving");
    expect(
      document.querySelector("[data-bowl]")?.getAttribute("data-bowl"),
    ).toBe("0");
    expect(screen.getByLabelText("Coins")).toHaveTextContent("0");
    expect(screen.getByRole("img", { name: "0 of 2 apples" })).toBeTruthy();
  });

  it("shows a hungry pet with one apple and a different drawing", () => {
    render(<PetCard pet={hungryPet} />);

    expect(screen.getByRole("img", { name: "Mochi is hungry" })).toBeTruthy();
    expect(petSvg("Mochi is hungry")).toContain('r="4.6"');
    expect(petSvg("Mochi is hungry")).not.toContain("q-5 8 0 10");
    expect(screen.getByText("Hungry")).toBeTruthy();
    expect(
      document
        .querySelector("[data-pet-state]")
        ?.getAttribute("data-pet-state"),
    ).toBe("hungry");
    expect(
      document.querySelector("[data-bowl]")?.getAttribute("data-bowl"),
    ).toBe("1");
    expect(screen.getByLabelText("Coins")).toHaveTextContent("385");
    expect(screen.getByRole("img", { name: "1 of 2 apples" })).toBeTruthy();
  });

  it("shows a full pet with two apples and a different drawing", () => {
    render(<PetCard pet={fullPet} />);

    expect(screen.getByRole("img", { name: "Mochi is full" })).toBeTruthy();
    expect(petSvg("Mochi is full")).toContain("#E8798A");
    expect(petSvg("Mochi is full")).not.toContain("q-5 8 0 10");
    expect(screen.getByText("Full")).toBeTruthy();
    expect(
      document
        .querySelector("[data-pet-state]")
        ?.getAttribute("data-pet-state"),
    ).toBe("full");
    expect(
      document.querySelector("[data-bowl]")?.getAttribute("data-bowl"),
    ).toBe("2");
    expect(screen.getByLabelText("Coins")).toHaveTextContent("460");
    expect(screen.getByRole("img", { name: "2 of 2 apples" })).toBeTruthy();
  });
});

describe("FeedingProgress (US4, #20)", () => {
  it("shows minutes toward the next apple", () => {
    render(<FeedingProgress pet={hungryPet} />);

    expect(screen.getByText("Apples today")).toBeTruthy();
    expect(screen.getByRole("img", { name: "1 of 2 apples" })).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: "Feeding progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "10");
    expect(bar).toHaveAttribute("aria-valuemax", "25");
    expect(bar).toHaveAttribute(
      "aria-valuetext",
      "10 of 25 min to the next apple",
    );
    expect(bar.querySelector("[data-fill]")?.getAttribute("style")).toContain(
      "40%",
    );
    expect(screen.getByText("10 of 25 min to the next apple")).toBeTruthy();
  });

  it("shows Full for today when two apples have been earned", () => {
    render(<FeedingProgress pet={fullPet} />);

    expect(screen.getByRole("img", { name: "2 of 2 apples" })).toBeTruthy();
    expect(screen.getByText("Full for today")).toBeTruthy();
    expect(screen.queryByText("0 of 25 min to the next apple")).toBeNull();
    const bar = screen.getByRole("progressbar", { name: "Feeding progress" });
    expect(bar).toHaveAttribute("aria-valuetext", "Full for today");
    expect(bar.querySelector("[data-fill]")?.getAttribute("style")).toContain(
      "100%",
    );
  });
});

describe("Home dashboard (US4, US5, #20)", () => {
  it("shows the starving home from the mockup and links to focus", () => {
    render(<DashboardView status="ready" pet={starvingPet} />);

    expect(
      screen.getByRole("heading", { name: "Mochi hasn’t eaten today." }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Finish a session to feed it. Every 25 minutes of focus earns an apple.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Starving")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Start focusing" }).getAttribute("href"),
    ).toBe("/focus");
    const layout = screen.getByTestId("dashboard");
    expect(layout.className).toContain("max-[600px]:grid-cols-1");
    expect(layout.className).toContain(
      "min-[601px]:grid-cols-[380px_minmax(0,1fr)]",
    );
    expect(document.querySelector("[data-pet-art]")?.className).toContain(
      "w-[220px]",
    );
    expect(document.querySelector("[data-pet-art]")?.className).toContain(
      "max-[600px]:w-[150px]",
    );
    expect(
      screen.getByRole("link", { name: "Start focusing" }).className,
    ).toContain("w-full");
    expect(
      screen.getByRole("link", { name: "Start focusing" }).className,
    ).toContain("min-[601px]:w-auto");
  });

  it("shows the hungry and full status messages", () => {
    const { unmount } = render(
      <DashboardView status="ready" pet={hungryPet} />,
    );
    expect(
      screen.getByRole("heading", { name: "One apple down, one to go." }),
    ).toBeTruthy();
    expect(
      screen.getByText("15 more minutes of focus earns the second apple."),
    ).toBeTruthy();
    unmount();

    render(<DashboardView status="ready" pet={fullPet} />);
    expect(
      screen.getByRole("heading", { name: "Mochi is full for today." }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "More sessions still earn coins. Apples start again at midnight.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Full for today")).toBeTruthy();
  });

  it("shows the active session bar and disables Start focusing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const session = activeSession();
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    render(
      <>
        <ActiveSessionBar session={session} />
        <DashboardView status="ready" pet={hungryPet} activeSession={session} />
      </>,
    );

    const bar = screen.getByRole("status");
    expect(bar.textContent).toContain("“Essay draft: intro” is running.");
    expect(bar.textContent).toContain("18:42 left");
    expect(bar.textContent).toContain(`ends at ${formatEndClock(END, zone)}`);
    expect(
      screen
        .getByRole("link", { name: "Return to session" })
        .getAttribute("href"),
    ).toBe("/focus");
    expect(
      screen.getByRole("button", { name: "Start focusing" }),
    ).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Start focusing" })).toBeNull();
    expect(
      screen.getByText(
        "One session at a time. Finish or give up the current one first.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("This session finishing earns the second apple."),
    ).toBeTruthy();
  });

  it("shows the dashboard skeleton while pet progress is loading", () => {
    render(<DashboardLoading />);

    expect(
      screen.getByRole("heading", { name: "Loading your dashboard" }),
    ).toBeTruthy();
    const busy = screen.getByTestId("dashboard-loading");
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy.querySelector(".dashboard-skeleton")).toBeTruthy();
    expect(busy.querySelector(".motion-reduce\\:animate-none")).toBeTruthy();
    expect(screen.queryByText("Start focusing")).toBeNull();
  });

  it("shows Couldn’t load and retries", () => {
    const onRetry = vi.fn();
    render(<DashboardError onRetry={onRetry} />);

    expect(
      screen.getByRole("heading", { name: "Couldn’t load your dashboard" }),
    ).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your internet connection and try again. Your pet, coins, and sessions are saved.",
    );
    expect(screen.getByRole("img", { name: "Mochi is waiting" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
