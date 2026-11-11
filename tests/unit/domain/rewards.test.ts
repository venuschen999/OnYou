import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPLE_MINUTES,
  FeedingState,
  MAX_APPLES_PER_DAY,
  MAX_FEEDING_MINUTES_PER_DAY,
  calculateRewards,
  getFeedingState,
  minutesTowardNextApple,
  type DailyFeedingTotals,
} from "@/lib/domain/rewards";

const ZERO: DailyFeedingTotals = { feedingMinutes: 0, apples: 0 };

describe("reward constants (PRD v2.9 §6)", () => {
  it("gives one apple per 25 feeding minutes", () => {
    expect(APPLE_MINUTES).toBe(25);
  });

  it("caps a feeding day at 50 minutes and 2 apples", () => {
    expect(MAX_FEEDING_MINUTES_PER_DAY).toBe(50);
    expect(MAX_APPLES_PER_DAY).toBe(2);
  });
});

describe("coins", () => {
  it.each([15, 25, 50])(
    "earns one coin per minute for a completed %i-minute session",
    (durationMinutes) => {
      const result = calculateRewards({
        status: "COMPLETED",
        durationMinutes,
        feedingBefore: ZERO,
      });

      expect(result.coinsEarned).toBe(durationMinutes);
    },
  );

  it("keeps earning coins after the pet is Full", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 15,
      feedingBefore: { feedingMinutes: 50, apples: 2 },
    });

    expect(result.coinsEarned).toBe(15);
  });
});

describe("abandoned sessions", () => {
  it("earn zero coins, feeding minutes, and apples", () => {
    const result = calculateRewards({
      status: "ABANDONED",
      durationMinutes: 25,
      feedingBefore: ZERO,
    });

    expect(result).toEqual({
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
      feedingAfter: ZERO,
    });
  });

  it("never remove rewards already earned that day", () => {
    const hungry = { feedingMinutes: 30, apples: 1 };

    const result = calculateRewards({
      status: "ABANDONED",
      durationMinutes: 50,
      feedingBefore: hungry,
    });

    expect(result.feedingAfter).toEqual(hungry);
  });
});

describe("feeding minutes cap", () => {
  it("adds the full duration while under the cap", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 50,
      feedingBefore: ZERO,
    });

    expect(result.feedingMinutesEarned).toBe(50);
    expect(result.feedingAfter.feedingMinutes).toBe(50);
  });

  it("discards minutes beyond 50 for the day", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 25,
      feedingBefore: { feedingMinutes: 30, apples: 1 },
    });

    expect(result.feedingMinutesEarned).toBe(20);
    expect(result.feedingAfter.feedingMinutes).toBe(50);
  });

  it("credits no feeding minutes or apples once the day is at the cap", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 15,
      feedingBefore: { feedingMinutes: 50, apples: 2 },
    });

    expect(result.feedingMinutesEarned).toBe(0);
    expect(result.applesEarned).toBe(0);
    expect(result.feedingAfter).toEqual({ feedingMinutes: 50, apples: 2 });
  });
});

describe("apples", () => {
  it("credits no apple before 25 feeding minutes", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 15,
      feedingBefore: ZERO,
    });

    expect(result.applesEarned).toBe(0);
    expect(result.feedingAfter.apples).toBe(0);
  });

  it("carries leftover minutes into the next session on the same day", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 15,
      feedingBefore: { feedingMinutes: 15, apples: 0 },
    });

    expect(result.applesEarned).toBe(1);
    expect(result.feedingAfter).toEqual({ feedingMinutes: 30, apples: 1 });
    expect(minutesTowardNextApple(result.feedingAfter.feedingMinutes)).toBe(5);
  });

  it("keeps one apple at 45 minutes with 20 toward the next", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 15,
      feedingBefore: { feedingMinutes: 30, apples: 1 },
    });

    expect(result.applesEarned).toBe(0);
    expect(result.feedingAfter).toEqual({ feedingMinutes: 45, apples: 1 });
    expect(minutesTowardNextApple(result.feedingAfter.feedingMinutes)).toBe(20);
  });

  it("credits two apples, the daily maximum, for one 50-minute session", () => {
    const result = calculateRewards({
      status: "COMPLETED",
      durationMinutes: 50,
      feedingBefore: ZERO,
    });

    expect(result.applesEarned).toBe(2);
    expect(result.feedingAfter.apples).toBe(2);
  });

  it.each([
    [0, 0],
    [5, 5],
    [24, 24],
    [25, 0],
    [30, 5],
    [50, 0],
  ])(
    "has %i feeding minutes leave %i toward the next apple",
    (minutes, left) => {
      expect(minutesTowardNextApple(minutes)).toBe(left);
    },
  );
});

describe("feeding state tokens", () => {
  it.each([
    [0, FeedingState.STARVING],
    [1, FeedingState.HUNGRY],
    [2, FeedingState.FULL],
  ])("maps %i apples to %s", (apples, state) => {
    expect(getFeedingState(apples)).toBe(state);
  });

  it("uses the AGENTS.md §4 tokens", () => {
    expect(FeedingState).toEqual({
      STARVING: "STARVING",
      HUNGRY: "HUNGRY",
      FULL: "FULL",
    });
  });
});

// Required by AGENTS.md §8: the PRD v2.9 §6 example, from zero on one feeding day.
describe("PRD v2.9 §6 example sequence", () => {
  it("complete 15, complete 15, give up 25, complete 25", () => {
    let coins = 0;
    let feeding = ZERO;
    const steps = [
      { status: "COMPLETED", durationMinutes: 15 },
      { status: "COMPLETED", durationMinutes: 15 },
      { status: "ABANDONED", durationMinutes: 25 },
      { status: "COMPLETED", durationMinutes: 25 },
    ] as const;

    const observed = steps.map((step) => {
      const result = calculateRewards({ ...step, feedingBefore: feeding });
      coins += result.coinsEarned;
      feeding = result.feedingAfter;
      return {
        coins,
        feedingMinutes: feeding.feedingMinutes,
        towardNextApple: minutesTowardNextApple(feeding.feedingMinutes),
        apples: feeding.apples,
        state: getFeedingState(feeding.apples),
      };
    });

    expect(observed).toEqual([
      {
        coins: 15,
        feedingMinutes: 15,
        towardNextApple: 15,
        apples: 0,
        state: "STARVING",
      },
      {
        coins: 30,
        feedingMinutes: 30,
        towardNextApple: 5,
        apples: 1,
        state: "HUNGRY",
      },
      {
        coins: 30,
        feedingMinutes: 30,
        towardNextApple: 5,
        apples: 1,
        state: "HUNGRY",
      },
      {
        coins: 55,
        feedingMinutes: 50,
        towardNextApple: 0,
        apples: 2,
        state: "FULL",
      },
    ]);
  });
});

describe("purity", () => {
  it("does not read the clock or import anything", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/domain/rewards.ts"),
      "utf8",
    );

    expect(source).not.toContain("Date.now");
    expect(source).not.toMatch(/new Date\(\s*\)/);
    expect(source).not.toMatch(/^import /m);
  });
});
