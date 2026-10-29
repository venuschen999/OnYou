import { describe, expect, it } from "vitest";
import {
  APPLE_MINUTES,
  MAX_APPLES_PER_DAY,
  MAX_FEEDING_MINUTES_PER_DAY,
  applesFromFeedingMinutes,
  calculateRewards,
  coinsEarned,
  feedingStateFromApples,
  leftoverMinutes,
} from "../../src/lib/domain/rewards";
import type { RewardInput } from "../../src/lib/domain/rewards";

const TIME_ZONE = "UTC";
const NOW = new Date("2026-03-15T18:00:00.000Z");
const END_TIME = new Date("2026-03-15T12:25:00.000Z");

function emptyTotals(): { coins: number; feedingMinutes: number } {
  return { coins: 0, feedingMinutes: 0 };
}

function applyRewards(
  current: { coins: number; feedingMinutes: number },
  status: RewardInput["status"],
  durationMinutes: number,
  extras: Partial<Pick<RewardInput, "endTime" | "now" | "timeZone">> = {},
) {
  return calculateRewards({
    status,
    durationMinutes,
    endTime: extras.endTime ?? END_TIME,
    now: extras.now ?? NOW,
    timeZone: extras.timeZone ?? TIME_ZONE,
    currentCoins: current.coins,
    currentFeedingMinutes: current.feedingMinutes,
  });
}

describe("coinsEarned", () => {
  it("awards one coin per minute of a completed session duration", () => {
    expect(coinsEarned("COMPLETED", 15)).toBe(15);
    expect(coinsEarned("COMPLETED", 25)).toBe(25);
    expect(coinsEarned("COMPLETED", 50)).toBe(50);
  });

  it("awards zero coins for an abandoned session", () => {
    expect(coinsEarned("ABANDONED", 25)).toBe(0);
  });
});

describe("applesFromFeedingMinutes", () => {
  it("credits one apple per 25 feeding minutes, up to two per feeding day", () => {
    expect(applesFromFeedingMinutes(0)).toBe(0);
    expect(applesFromFeedingMinutes(15)).toBe(0);
    expect(applesFromFeedingMinutes(APPLE_MINUTES)).toBe(1);
    expect(applesFromFeedingMinutes(30)).toBe(1);
    expect(applesFromFeedingMinutes(MAX_FEEDING_MINUTES_PER_DAY)).toBe(
      MAX_APPLES_PER_DAY,
    );
  });
});

describe("leftoverMinutes", () => {
  it("carries leftover minutes toward the next apple within the feeding day", () => {
    expect(leftoverMinutes(15)).toBe(15);
    expect(leftoverMinutes(30)).toBe(5);
    expect(leftoverMinutes(MAX_FEEDING_MINUTES_PER_DAY)).toBe(0);
  });
});

describe("feedingStateFromApples", () => {
  it("maps 0 apples to Starving, 1 to Hungry, and 2 to Full", () => {
    expect(feedingStateFromApples(0)).toBe("STARVING");
    expect(feedingStateFromApples(1)).toBe("HUNGRY");
    expect(feedingStateFromApples(2)).toBe("FULL");
  });
});

describe("calculateRewards", () => {
  it("follows the PRD v2.9 section 6 sequence from zero on one feeding day", () => {
    const afterFirst15 = applyRewards(emptyTotals(), "COMPLETED", 15);
    expect(afterFirst15.coins).toBe(15);
    expect(afterFirst15.feedingMinutes).toBe(15);
    expect(afterFirst15.apples).toBe(0);
    expect(afterFirst15.leftoverMinutes).toBe(15);
    expect(afterFirst15.discardedMinutes).toBe(0);
    expect(afterFirst15.feedingState).toBe("STARVING");

    const afterSecond15 = applyRewards(afterFirst15, "COMPLETED", 15);
    expect(afterSecond15.coins).toBe(30);
    expect(afterSecond15.feedingMinutes).toBe(30);
    expect(afterSecond15.apples).toBe(1);
    expect(afterSecond15.leftoverMinutes).toBe(5);
    expect(afterSecond15.discardedMinutes).toBe(0);
    expect(afterSecond15.feedingState).toBe("HUNGRY");

    const afterGiveUp = applyRewards(afterSecond15, "ABANDONED", 25);
    expect(afterGiveUp.coins).toBe(30);
    expect(afterGiveUp.feedingMinutes).toBe(30);
    expect(afterGiveUp.apples).toBe(1);
    expect(afterGiveUp.leftoverMinutes).toBe(5);
    expect(afterGiveUp.discardedMinutes).toBe(0);
    expect(afterGiveUp.feedingState).toBe("HUNGRY");

    const afterComplete25 = applyRewards(afterGiveUp, "COMPLETED", 25);
    expect(afterComplete25.coins).toBe(55);
    expect(afterComplete25.feedingMinutes).toBe(50);
    expect(afterComplete25.apples).toBe(2);
    expect(afterComplete25.leftoverMinutes).toBe(0);
    expect(afterComplete25.discardedMinutes).toBe(5);
    expect(afterComplete25.feedingState).toBe("FULL");
  });

  it("adds zero coins and zero feeding minutes for an abandoned session", () => {
    const result = applyRewards(emptyTotals(), "ABANDONED", 50);

    expect(result.coins).toBe(0);
    expect(result.feedingMinutes).toBe(0);
    expect(result.apples).toBe(0);
    expect(result.discardedMinutes).toBe(0);
    expect(result.feedingState).toBe("STARVING");
  });

  it("does not remove already earned rewards when a later session is abandoned", () => {
    const earned = applyRewards(emptyTotals(), "COMPLETED", 25);
    const afterAbandon = applyRewards(earned, "ABANDONED", 50);

    expect(afterAbandon.coins).toBe(earned.coins);
    expect(afterAbandon.feedingMinutes).toBe(earned.feedingMinutes);
    expect(afterAbandon.apples).toBe(earned.apples);
    expect(afterAbandon.feedingState).toBe(earned.feedingState);
  });

  it("caps feeding minutes at 50 per feeding day and discards the rest", () => {
    const result = applyRewards(
      { coins: 0, feedingMinutes: 40 },
      "COMPLETED",
      25,
    );

    expect(result.feedingMinutes).toBe(MAX_FEEDING_MINUTES_PER_DAY);
    expect(result.discardedMinutes).toBe(15);
    expect(result.apples).toBe(MAX_APPLES_PER_DAY);
  });

  it("keeps adding coins after the pet is Full", () => {
    const full = applyRewards(
      { coins: 50, feedingMinutes: MAX_FEEDING_MINUTES_PER_DAY },
      "COMPLETED",
      15,
    );

    expect(full.coins).toBe(65);
    expect(full.feedingMinutes).toBe(MAX_FEEDING_MINUTES_PER_DAY);
    expect(full.apples).toBe(MAX_APPLES_PER_DAY);
    expect(full.feedingState).toBe("FULL");
    expect(full.discardedMinutes).toBe(15);
  });

  it("credits the feeding day of endTime even when now is a later day", () => {
    const endTime = new Date("2026-03-15T23:00:00.000Z");
    const laterNow = new Date("2026-03-16T18:00:00.000Z");

    const result = applyRewards(emptyTotals(), "COMPLETED", 15, {
      endTime,
      now: laterNow,
      timeZone: "UTC",
    });

    expect(result.feedingDay).toBe("2026-03-15");
    expect(result.coins).toBe(15);
    expect(result.feedingMinutes).toBe(15);
  });
});
