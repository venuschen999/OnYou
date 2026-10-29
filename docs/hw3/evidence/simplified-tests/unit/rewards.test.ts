import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { feedingDay } from "../../src/lib/domain/feedingDay";
import { FeedingState } from "../../src/lib/domain/feedingState";
import {
  applesForFeedingMinutes,
  applyDailyReset,
  applyFeedingMinuteCap,
  calculateRewards,
  coinsEarnedForSession,
  emptyRewardState,
  leftoverFeedingMinutes,
  type PetRewardState,
} from "../../src/lib/domain/rewards";
import { SessionStatus } from "../../src/lib/domain/sessionStatus";
import { buildRewardSession } from "../factories/rewardSession";

const TIME_ZONE = "America/Los_Angeles";
const SAME_DAY = new Date("2026-10-28T20:00:00.000Z");

function snapshot(state: PetRewardState, sessionEnd: Date = SAME_DAY) {
  return calculateRewards(
    state,
    buildRewardSession({ durationMinutes: 15, endTime: sessionEnd }),
    SAME_DAY,
    TIME_ZONE,
  );
}

describe("reward domain constraints", () => {
  it("does not read the clock or a database client", () => {
    const dir = join(process.cwd(), "src/lib/domain");
    const source = readdirSync(dir)
      .filter((name) => name.endsWith(".ts"))
      .map((name) => readFileSync(join(dir, name), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/Date\.now\s*\(/);
    expect(source).not.toMatch(/new Date\(\s*\)/);
    expect(source).not.toMatch(/prisma/i);
  });
});

describe("coins", () => {
  it("awards one coin per minute only when the session is completed", () => {
    expect(coinsEarnedForSession(SessionStatus.COMPLETED, 15)).toBe(15);
    expect(coinsEarnedForSession(SessionStatus.COMPLETED, 25)).toBe(25);
    expect(coinsEarnedForSession(SessionStatus.COMPLETED, 50)).toBe(50);
    expect(coinsEarnedForSession(SessionStatus.ABANDONED, 25)).toBe(0);
    expect(coinsEarnedForSession(SessionStatus.ACTIVE, 25)).toBe(0);
  });
});

describe("feeding minutes, apples, and leftover minutes", () => {
  it("caps credited minutes at 50 for the feeding day and discards the rest", () => {
    expect(applyFeedingMinuteCap(30, 25)).toEqual({
      feedingMinutes: 50,
      minutesCredited: 20,
      minutesDiscarded: 5,
    });
    expect(applyFeedingMinuteCap(50, 15)).toEqual({
      feedingMinutes: 50,
      minutesCredited: 0,
      minutesDiscarded: 15,
    });
    expect(applyFeedingMinuteCap(0, 15)).toEqual({
      feedingMinutes: 15,
      minutesCredited: 15,
      minutesDiscarded: 0,
    });
  });

  it("gives one apple per 25 feeding minutes, up to two, and keeps the leftover", () => {
    expect(applesForFeedingMinutes(0)).toBe(0);
    expect(applesForFeedingMinutes(15)).toBe(0);
    expect(applesForFeedingMinutes(25)).toBe(1);
    expect(applesForFeedingMinutes(30)).toBe(1);
    expect(applesForFeedingMinutes(49)).toBe(1);
    expect(applesForFeedingMinutes(50)).toBe(2);

    expect(leftoverFeedingMinutes(15)).toBe(15);
    expect(leftoverFeedingMinutes(30)).toBe(5);
    expect(leftoverFeedingMinutes(50)).toBe(0);
  });
});

describe("PRD v2.9 section 6 sequence on one feeding day", () => {
  it("completes 15, completes 15, gives up 25, then completes 25 from zero", () => {
    const now = SAME_DAY;
    const endTime = SAME_DAY;
    let state = emptyRewardState(now, TIME_ZONE);

    const afterFirst = calculateRewards(
      state,
      buildRewardSession({ durationMinutes: 15, endTime }),
      now,
      TIME_ZONE,
    );
    expect(afterFirst).toMatchObject({
      coins: 15,
      feedingMinutes: 15,
      apples: 0,
      leftoverMinutes: 15,
      feedingState: FeedingState.STARVING,
      coinsEarned: 15,
      feedingMinutesEarned: 15,
      minutesDiscarded: 0,
    });
    expect(afterFirst.feedingDay).toBe(feedingDay(endTime, TIME_ZONE));

    const afterSecond = calculateRewards(
      afterFirst,
      buildRewardSession({ durationMinutes: 15, endTime }),
      now,
      TIME_ZONE,
    );
    expect(afterSecond).toMatchObject({
      coins: 30,
      feedingMinutes: 30,
      apples: 1,
      leftoverMinutes: 5,
      feedingState: FeedingState.HUNGRY,
      coinsEarned: 15,
      feedingMinutesEarned: 15,
      applesEarned: 1,
      minutesDiscarded: 0,
    });

    const beforeGiveUp = { ...afterSecond };
    const afterGiveUp = calculateRewards(
      afterSecond,
      buildRewardSession({
        status: SessionStatus.ABANDONED,
        durationMinutes: 25,
        endTime,
      }),
      now,
      TIME_ZONE,
    );
    expect(afterGiveUp).toMatchObject({
      coins: 30,
      feedingMinutes: 30,
      apples: 1,
      leftoverMinutes: 5,
      feedingState: FeedingState.HUNGRY,
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
      minutesDiscarded: 0,
    });
    expect(afterSecond).toEqual(beforeGiveUp);

    const afterThird = calculateRewards(
      afterGiveUp,
      buildRewardSession({ durationMinutes: 25, endTime }),
      now,
      TIME_ZONE,
    );
    expect(afterThird).toMatchObject({
      coins: 55,
      feedingMinutes: 50,
      apples: 2,
      leftoverMinutes: 0,
      feedingState: FeedingState.FULL,
      coinsEarned: 25,
      feedingMinutesEarned: 20,
      applesEarned: 1,
      minutesDiscarded: 5,
    });
    expect(afterThird.feedingDay).toBe("2026-10-28");
  });
});

describe("abandoned and active sessions", () => {
  it("adds nothing and keeps coins, minutes, and apples already earned", () => {
    const state: PetRewardState = {
      coins: 30,
      feedingDay: "2026-10-28",
      feedingMinutes: 30,
      apples: 1,
    };

    const abandoned = calculateRewards(
      state,
      buildRewardSession({
        status: SessionStatus.ABANDONED,
        durationMinutes: 50,
        endTime: SAME_DAY,
      }),
      SAME_DAY,
      TIME_ZONE,
    );
    const active = calculateRewards(
      state,
      buildRewardSession({
        status: SessionStatus.ACTIVE,
        durationMinutes: 50,
        endTime: SAME_DAY,
      }),
      SAME_DAY,
      TIME_ZONE,
    );

    for (const result of [abandoned, active]) {
      expect(result).toMatchObject({
        coins: 30,
        feedingMinutes: 30,
        apples: 1,
        leftoverMinutes: 5,
        feedingState: FeedingState.HUNGRY,
        coinsEarned: 0,
        feedingMinutesEarned: 0,
        applesEarned: 0,
        minutesDiscarded: 0,
      });
    }
    expect(state).toEqual({
      coins: 30,
      feedingDay: "2026-10-28",
      feedingMinutes: 30,
      apples: 1,
    });
  });
});

describe("coins after the pet is Full", () => {
  it("keeps adding coins when the daily feeding cap is already reached", () => {
    const state: PetRewardState = {
      coins: 55,
      feedingDay: "2026-10-28",
      feedingMinutes: 50,
      apples: 2,
    };

    const result = calculateRewards(
      state,
      buildRewardSession({ durationMinutes: 15, endTime: SAME_DAY }),
      SAME_DAY,
      TIME_ZONE,
    );

    expect(result).toMatchObject({
      coins: 70,
      feedingMinutes: 50,
      apples: 2,
      leftoverMinutes: 0,
      feedingState: FeedingState.FULL,
      coinsEarned: 15,
      feedingMinutesEarned: 0,
      applesEarned: 0,
      minutesDiscarded: 15,
    });
  });
});

describe("daily reset", () => {
  it("leaves apples and feeding minutes in place during the same feeding day", () => {
    const state: PetRewardState = {
      coins: 15,
      feedingDay: "2026-10-28",
      feedingMinutes: 15,
      apples: 0,
    };

    const reset = applyDailyReset(state, SAME_DAY, TIME_ZONE);

    expect(reset).toEqual(state);
    expect(reset).not.toBe(state);
  });

  it("clears apples and feeding minutes on a later feeding day and keeps coins", () => {
    const state: PetRewardState = {
      coins: 40,
      feedingDay: "2026-10-01",
      feedingMinutes: 40,
      apples: 1,
    };

    const reset = applyDailyReset(
      state,
      new Date("2026-10-28T20:00:00.000Z"),
      TIME_ZONE,
    );

    expect(reset).toEqual({
      coins: 40,
      feedingDay: "2026-10-28",
      feedingMinutes: 0,
      apples: 0,
    });
    expect(state.coins).toBe(40);
    expect(state.feedingMinutes).toBe(40);
  });

  it("does not carry leftover minutes into the next feeding day", () => {
    const state: PetRewardState = {
      coins: 15,
      feedingDay: "2026-10-27",
      feedingMinutes: 15,
      apples: 0,
    };
    const endTime = new Date("2026-10-28T20:00:00.000Z");

    const result = calculateRewards(
      state,
      buildRewardSession({ durationMinutes: 15, endTime }),
      endTime,
      TIME_ZONE,
    );

    expect(result).toMatchObject({
      coins: 30,
      feedingDay: "2026-10-28",
      feedingMinutes: 15,
      apples: 0,
      leftoverMinutes: 15,
      feedingState: FeedingState.STARVING,
      feedingMinutesEarned: 15,
      minutesDiscarded: 0,
    });
  });
});

describe("feeding day of the scheduled end", () => {
  it("credits a session that ends after local midnight to the end date", () => {
    const endTime = new Date("2026-10-28T07:30:00.000Z");
    const now = new Date("2026-10-28T08:00:00.000Z");
    const state: PetRewardState = {
      coins: 40,
      feedingDay: "2026-10-27",
      feedingMinutes: 40,
      apples: 1,
    };

    const result = calculateRewards(
      state,
      buildRewardSession({ durationMinutes: 50, endTime }),
      now,
      TIME_ZONE,
    );

    expect(feedingDay(endTime, TIME_ZONE)).toBe("2026-10-28");
    expect(result).toMatchObject({
      coins: 90,
      feedingDay: "2026-10-28",
      feedingMinutes: 50,
      apples: 2,
      leftoverMinutes: 0,
      feedingState: FeedingState.FULL,
      coinsEarned: 50,
      feedingMinutesEarned: 50,
      applesEarned: 2,
      minutesDiscarded: 0,
    });
  });

  it("applies a late resolution to the endTime feeding day and not the later day", () => {
    const endTime = new Date("2026-10-28T06:00:00.000Z");
    const now = new Date("2026-10-28T20:00:00.000Z");
    const state: PetRewardState = {
      coins: 40,
      feedingDay: "2026-10-27",
      feedingMinutes: 40,
      apples: 1,
    };

    const result = calculateRewards(
      state,
      buildRewardSession({ durationMinutes: 25, endTime }),
      now,
      TIME_ZONE,
    );

    expect(feedingDay(endTime, TIME_ZONE)).toBe("2026-10-27");
    expect(feedingDay(now, TIME_ZONE)).toBe("2026-10-28");
    expect(result).toMatchObject({
      coins: 65,
      feedingDay: "2026-10-27",
      feedingMinutes: 50,
      apples: 2,
      leftoverMinutes: 0,
      feedingState: FeedingState.FULL,
      coinsEarned: 25,
      feedingMinutesEarned: 10,
      applesEarned: 1,
      minutesDiscarded: 15,
    });
  });

  it("does not add feeding minutes when stored progress is already on a later day", () => {
    const endTime = new Date("2026-10-28T06:00:00.000Z");
    const now = new Date("2026-10-28T20:00:00.000Z");
    const state: PetRewardState = {
      coins: 40,
      feedingDay: "2026-10-28",
      feedingMinutes: 0,
      apples: 0,
    };

    const result = calculateRewards(
      state,
      buildRewardSession({ durationMinutes: 25, endTime }),
      now,
      TIME_ZONE,
    );

    expect(result).toMatchObject({
      coins: 65,
      feedingDay: "2026-10-28",
      feedingMinutes: 0,
      apples: 0,
      coinsEarned: 25,
      feedingMinutesEarned: 0,
      applesEarned: 0,
      minutesDiscarded: 0,
    });
  });
});

describe("calculateRewards purity", () => {
  it("returns a new result without changing the previous totals", () => {
    const state = emptyRewardState(SAME_DAY, TIME_ZONE);
    const result = snapshot(state);

    expect(result).not.toBe(state);
    expect(state).toEqual({
      coins: 0,
      feedingDay: "2026-10-28",
      feedingMinutes: 0,
      apples: 0,
    });
    expect(result.coins).toBe(15);
  });
});
