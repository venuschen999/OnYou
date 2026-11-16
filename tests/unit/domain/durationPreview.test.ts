import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  appleHint,
  coinHint,
  previewDurationRewards,
  rewardSummary,
  type TodayFeeding,
} from "@/lib/domain/durationPreview";

// #72: each duration card previews what finishing it would earn, using the
// same rules as the server (calculateRewards, PRD v2.9 §6).
const FRESH: TodayFeeding = {
  applesToday: 0,
  feedingMinutesTowardNextApple: 0,
};
const ONE_APPLE: TodayFeeding = {
  applesToday: 1,
  feedingMinutesTowardNextApple: 5,
};
const FULL: TodayFeeding = { applesToday: 2, feedingMinutesTowardNextApple: 0 };

function hintFor(minutes: number, today: TodayFeeding): string {
  return appleHint(previewDurationRewards(minutes, today));
}

describe("coinHint", () => {
  it.each([15, 25, 50])("shows +%i coins", (minutes) => {
    expect(coinHint(minutes)).toBe(`+${minutes} coins`);
  });
});

describe("apple hint on a fresh day", () => {
  it("15 minutes moves toward an apple", () => {
    expect(hintFor(15, FRESH)).toBe("15 min toward an apple");
  });

  it("25 minutes earns 1 apple", () => {
    expect(hintFor(25, FRESH)).toBe("+1 apple");
  });

  it("50 minutes earns 2 apples", () => {
    expect(hintFor(50, FRESH)).toBe("+2 apples");
  });
});

describe("apple hint after 1 apple and 5 minutes toward the next", () => {
  it("15 minutes still moves toward an apple", () => {
    expect(hintFor(15, ONE_APPLE)).toBe("15 min toward an apple");
  });

  it("25 minutes earns the second apple", () => {
    expect(hintFor(25, ONE_APPLE)).toBe("+1 apple");
  });

  it("50 minutes earns only 1 apple because 2 is the daily maximum", () => {
    expect(hintFor(50, ONE_APPLE)).toBe("+1 apple");
  });
});

describe("apple hint edge cases", () => {
  it("15 minutes completes an apple when 10 minutes are already banked", () => {
    expect(
      hintFor(15, { applesToday: 0, feedingMinutesTowardNextApple: 10 }),
    ).toBe("+1 apple");
  });

  it.each([15, 25, 50])("%i minutes earns no apple once Full", (minutes) => {
    expect(hintFor(minutes, FULL)).toBe("Full today");
  });

  it("previews the same coins and apples as the server reward rules", () => {
    expect(previewDurationRewards(50, ONE_APPLE)).toEqual({
      coins: 50,
      applesEarned: 1,
      feedingMinutesEarned: 20,
    });
  });
});

describe("rewardSummary", () => {
  it("names the pet and says 2 apples make it full", () => {
    expect(rewardSummary("Biscuit", 1)).toEqual({
      lead: "Biscuit needs 2 apples to be full today!",
      detail:
        "Every 25 minutes of finished focus feeds one apple, and each minute earns a coin.",
    });
  });

  it("switches to the Full wording at 2 apples", () => {
    expect(rewardSummary("Mochi", 2)).toEqual({
      lead: "Mochi is full today!",
      detail: "Focus still earns a coin per minute.",
    });
  });
});

describe("purity", () => {
  it("does not read the clock or import outside the domain", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/domain/durationPreview.ts"),
      "utf8",
    );
    expect(source).not.toContain("Date.now");
    expect(source).not.toMatch(/new Date\(\s*\)/);
    expect(source).not.toMatch(/from "(?!\.\/|@\/lib\/domain\/)/);
  });
});
