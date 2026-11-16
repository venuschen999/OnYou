// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusSetup } from "@/components/FocusSetup";

// #72: Focus setup previews what each duration earns from today's progress.
type Today = {
  name: string;
  applesToday: number;
  feedingMinutesTowardNextApple: number;
};

let today: Today | null = null;
const fetchMock = vi.fn(async (url: string) => {
  if (String(url) !== "/api/pet") throw new Error(`unexpected fetch ${url}`);
  if (!today) throw new TypeError("network down");
  return new Response(
    JSON.stringify({
      ...today,
      coins: 0,
      feedingState: ["STARVING", "HUNGRY", "FULL"][today.applesToday],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
});

function card(minutes: number): HTMLElement {
  const radio = screen.getByRole("radio", { name: `${minutes} minutes` });
  const label = radio.closest("label");
  if (!label) throw new Error(`no card for ${minutes}`);
  return label;
}

function renderSetup(): void {
  render(<FocusSetup starting={false} onStart={() => undefined} />);
}

beforeEach(() => {
  today = null;
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockClear();
});

describe("duration reward hints (#72)", () => {
  it("shows coins and apples for a fresh day", async () => {
    today = { name: "Mochi", applesToday: 0, feedingMinutesTowardNextApple: 0 };
    renderSetup();

    expect(await within(card(25)).findByText("+1 apple")).toBeInTheDocument();
    expect(within(card(15)).getByText("+15 coins")).toBeInTheDocument();
    expect(
      within(card(15)).getByText("15 min toward an apple"),
    ).toBeInTheDocument();
    expect(within(card(25)).getByText("+25 coins")).toBeInTheDocument();
    expect(within(card(50)).getByText("+50 coins")).toBeInTheDocument();
    expect(within(card(50)).getByText("+2 apples")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/pet", expect.anything());
  });

  it("caps the 50-minute hint at 1 apple after the first apple", async () => {
    today = { name: "Mochi", applesToday: 1, feedingMinutesTowardNextApple: 5 };
    renderSetup();

    expect(await within(card(50)).findByText("+1 apple")).toBeInTheDocument();
    expect(within(card(25)).getByText("+1 apple")).toBeInTheDocument();
  });

  it("names the pet in the summary", async () => {
    today = {
      name: "Biscuit",
      applesToday: 0,
      feedingMinutesTowardNextApple: 0,
    };
    renderSetup();

    expect(
      await screen.findByText("Biscuit needs 2 apples to be full today!"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Every 25 minutes of finished focus feeds one apple, and each minute earns a coin.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Full today and the Full summary once the pet has 2 apples", async () => {
    today = { name: "Mochi", applesToday: 2, feedingMinutesTowardNextApple: 0 };
    renderSetup();

    expect(await screen.findByText("Mochi is full today!")).toBeInTheDocument();
    for (const minutes of [15, 25, 50]) {
      expect(within(card(minutes)).getByText("Full today")).toBeInTheDocument();
    }
  });

  it("still shows coins and the summary when today's progress cannot load", async () => {
    renderSetup();

    expect(
      await screen.findByText("Your pet needs 2 apples to be full today!"),
    ).toBeInTheDocument();
    expect(within(card(25)).getByText("+25 coins")).toBeInTheDocument();
    expect(within(card(25)).queryByText("+1 apple")).not.toBeInTheDocument();
  });

  it("describes each radio with its hints for screen readers", async () => {
    today = { name: "Mochi", applesToday: 0, feedingMinutesTowardNextApple: 0 };
    renderSetup();
    await within(card(25)).findByText("+1 apple");

    expect(
      screen.getByRole("radio", { name: "25 minutes" }),
    ).toHaveAccessibleDescription("+25 coins, +1 apple");
  });

  it("never describes coins as something to spend", async () => {
    today = { name: "Mochi", applesToday: 0, feedingMinutesTowardNextApple: 0 };
    renderSetup();
    await within(card(25)).findByText("+1 apple");

    expect(document.body.textContent ?? "").not.toMatch(/spend|shop|buy/i);
  });
});
