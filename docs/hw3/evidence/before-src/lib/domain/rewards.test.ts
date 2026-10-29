import { describe, expect, it } from "vitest";
import {
  applesFromFeedingMinutes,
  applyDailyFeedingCap,
  applySessionRewards,
  coinsFromSession,
  DAILY_FEEDING_MINUTES_CAP,
  feedingMinutesFromSession,
  feedingStateFromApples,
  initialRewardState,
  leftoverMinutesFromFeedingMinutes,
  rewardStateAsOf,
} from "./index";
import type { RewardState, SessionRewardInput } from "./types";

const timeZone = "America/Los_Angeles";
const feedingDay = "2026-01-15";
const endTime = new Date("2026-01-15T15:00:00-08:00");
const now = new Date("2026-01-15T18:00:00-08:00");

function apply(
  current: RewardState,
  session: SessionRewardInput,
): RewardState {
  return applySessionRewards(current, session, now, timeZone);
}

describe("PRD v2.9 §6 example sequence", () => {
  it("starts from zero and follows complete 15, complete 15, give up 25, complete 25", () => {
    let state = initialRewardState(now, timeZone);
    expect(state).toEqual({
      coins: 0,
      feedingMinutes: 0,
      apples: 0,
      leftoverMinutes: 0,
      feedingState: "Starving",
      feedingDay,
    });

    state = apply(state, {
      status: "Completed",
      durationMinutes: 15,
      endTime,
    });
    expect(state).toEqual({
      coins: 15,
      feedingMinutes: 15,
      apples: 0,
      leftoverMinutes: 15,
      feedingState: "Starving",
      feedingDay,
    });

    state = apply(state, {
      status: "Completed",
      durationMinutes: 15,
      endTime,
    });
    expect(state).toEqual({
      coins: 30,
      feedingMinutes: 30,
      apples: 1,
      leftoverMinutes: 5,
      feedingState: "Hungry",
      feedingDay,
    });

    const afterGiveUp = apply(state, {
      status: "Abandoned",
      durationMinutes: 25,
      endTime,
    });
    expect(afterGiveUp).toEqual(state);

    state = apply(afterGiveUp, {
      status: "Completed",
      durationMinutes: 25,
      endTime,
    });
    expect(state).toEqual({
      coins: 55,
      feedingMinutes: 50,
      apples: 2,
      leftoverMinutes: 0,
      feedingState: "Full",
      feedingDay,
    });
  });
});

describe("coins", () => {
  it("awards one coin per minute of a completed session duration", () => {
    expect(coinsFromSession("Completed", 15)).toBe(15);
    expect(coinsFromSession("Completed", 25)).toBe(25);
    expect(coinsFromSession("Completed", 50)).toBe(50);
  });

  it("awards zero coins for an abandoned session", () => {
    expect(coinsFromSession("Abandoned", 25)).toBe(0);
  });

  it("keeps increasing coins after the pet is Full", () => {
    const full: RewardState = {
      coins: 55,
      feedingMinutes: 50,
      apples: 2,
      leftoverMinutes: 0,
      feedingState: "Full",
      feedingDay,
    };

    const next = apply(full, {
      status: "Completed",
      durationMinutes: 15,
      endTime,
    });

    expect(next.coins).toBe(70);
    expect(next.feedingMinutes).toBe(50);
    expect(next.apples).toBe(2);
    expect(next.feedingState).toBe("Full");
  });
});

describe("feeding minutes, apples, leftover, cap, and state", () => {
  it("credits zero feeding minutes for an abandoned session", () => {
    expect(feedingMinutesFromSession("Abandoned", 25)).toBe(0);
    expect(feedingMinutesFromSession("Completed", 25)).toBe(25);
  });

  it("discards minutes beyond the 50-minute daily cap", () => {
    expect(applyDailyFeedingCap(30, 25)).toEqual({
      feedingMinutes: DAILY_FEEDING_MINUTES_CAP,
      discardedMinutes: 5,
    });
    expect(applyDailyFeedingCap(50, 15)).toEqual({
      feedingMinutes: 50,
      discardedMinutes: 15,
    });
  });

  it("gives one apple per 25 feeding minutes, up to two per feeding day", () => {
    expect(applesFromFeedingMinutes(0)).toBe(0);
    expect(applesFromFeedingMinutes(15)).toBe(0);
    expect(applesFromFeedingMinutes(25)).toBe(1);
    expect(applesFromFeedingMinutes(30)).toBe(1);
    expect(applesFromFeedingMinutes(50)).toBe(2);
  });

  it("carries leftover minutes within the same feeding day", () => {
    expect(leftoverMinutesFromFeedingMinutes(15)).toBe(15);
    expect(leftoverMinutesFromFeedingMinutes(30)).toBe(5);
    expect(leftoverMinutesFromFeedingMinutes(50)).toBe(0);
  });

  it("maps apples to Starving, Hungry, and Full", () => {
    expect(feedingStateFromApples(0)).toBe("Starving");
    expect(feedingStateFromApples(1)).toBe("Hungry");
    expect(feedingStateFromApples(2)).toBe("Full");
  });
});

describe("feeding-day timezone and daily reset", () => {
  it("assigns rewards to the session endTime feeding day even when applied later", () => {
    const laterNow = new Date("2026-01-16T10:00:00-08:00");
    const state = applySessionRewards(
      initialRewardState(endTime, timeZone),
      { status: "Completed", durationMinutes: 15, endTime },
      laterNow,
      timeZone,
    );

    expect(state.feedingDay).toBe("2026-01-15");
    expect(state.coins).toBe(15);
    expect(state.feedingMinutes).toBe(15);
    expect(state.apples).toBe(0);
  });

  it("does not credit a later feeding day when the session ended on a previous day", () => {
    const laterNow = new Date("2026-01-16T10:00:00-08:00");
    const credited = applySessionRewards(
      initialRewardState(endTime, timeZone),
      { status: "Completed", durationMinutes: 25, endTime },
      laterNow,
      timeZone,
    );
    const viewedToday = rewardStateAsOf(credited, laterNow, timeZone);

    expect(credited.feedingDay).toBe("2026-01-15");
    expect(viewedToday).toEqual({
      coins: 25,
      feedingMinutes: 0,
      apples: 0,
      leftoverMinutes: 0,
      feedingState: "Starving",
      feedingDay: "2026-01-16",
    });
  });

  it("assigns a session that crosses midnight to the endTime feeding day", () => {
    const midnightEnd = new Date("2026-01-16T00:10:00-08:00");
    const state = applySessionRewards(
      initialRewardState(endTime, timeZone),
      { status: "Completed", durationMinutes: 50, endTime: midnightEnd },
      midnightEnd,
      timeZone,
    );

    expect(state.feedingDay).toBe("2026-01-16");
    expect(state.feedingMinutes).toBe(50);
    expect(state.apples).toBe(2);
    expect(state.feedingState).toBe("Full");
  });

  it("resets apples and feeding minutes at midnight in the user timezone and keeps coins", () => {
    const full: RewardState = {
      coins: 55,
      feedingMinutes: 50,
      apples: 2,
      leftoverMinutes: 0,
      feedingState: "Full",
      feedingDay: "2026-01-15",
    };

    const beforeMidnight = rewardStateAsOf(
      full,
      new Date("2026-01-15T23:59:59-08:00"),
      timeZone,
    );
    expect(beforeMidnight).toEqual(full);

    const atMidnight = rewardStateAsOf(
      full,
      new Date("2026-01-16T00:00:00-08:00"),
      timeZone,
    );
    expect(atMidnight).toEqual({
      coins: 55,
      feedingMinutes: 0,
      apples: 0,
      leftoverMinutes: 0,
      feedingState: "Starving",
      feedingDay: "2026-01-16",
    });
  });
});
