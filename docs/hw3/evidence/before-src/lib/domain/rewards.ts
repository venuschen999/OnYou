import {
  DAILY_FEEDING_MINUTES_CAP,
  MAX_APPLES_PER_FEEDING_DAY,
  MINUTES_PER_APPLE,
} from "./constants";
import { feedingDayOf } from "./feedingDay";
import type {
  FeedingState,
  RewardState,
  SessionRewardInput,
  SessionStatus,
} from "./types";

export function coinsFromSession(
  status: SessionStatus,
  durationMinutes: number,
): number {
  return status === "Completed" ? durationMinutes : 0;
}

export function feedingMinutesFromSession(
  status: SessionStatus,
  durationMinutes: number,
): number {
  return status === "Completed" ? durationMinutes : 0;
}

export function applyDailyFeedingCap(
  currentFeedingMinutes: number,
  addedMinutes: number,
): { feedingMinutes: number; discardedMinutes: number } {
  const total = currentFeedingMinutes + addedMinutes;
  const feedingMinutes = Math.min(DAILY_FEEDING_MINUTES_CAP, total);
  return {
    feedingMinutes,
    discardedMinutes: total - feedingMinutes,
  };
}

export function applesFromFeedingMinutes(feedingMinutes: number): number {
  return Math.min(
    MAX_APPLES_PER_FEEDING_DAY,
    Math.floor(feedingMinutes / MINUTES_PER_APPLE),
  );
}

export function leftoverMinutesFromFeedingMinutes(
  feedingMinutes: number,
): number {
  return feedingMinutes % MINUTES_PER_APPLE;
}

export function feedingStateFromApples(apples: number): FeedingState {
  if (apples >= MAX_APPLES_PER_FEEDING_DAY) {
    return "Full";
  }
  if (apples === 1) {
    return "Hungry";
  }
  return "Starving";
}

function feedingFields(feedingMinutes: number, feedingDay: string) {
  const apples = applesFromFeedingMinutes(feedingMinutes);
  return {
    feedingMinutes,
    apples,
    leftoverMinutes: leftoverMinutesFromFeedingMinutes(feedingMinutes),
    feedingState: feedingStateFromApples(apples),
    feedingDay,
  };
}

export function initialRewardState(now: Date, timeZone: string): RewardState {
  return {
    coins: 0,
    ...feedingFields(0, feedingDayOf(now, timeZone)),
  };
}

/**
 * Today's feeding progress at `now` in `timeZone`.
 * Apples and feeding minutes reset at midnight; coins remain.
 */
export function rewardStateAsOf(
  current: RewardState,
  now: Date,
  timeZone: string,
): RewardState {
  const today = feedingDayOf(now, timeZone);
  if (current.feedingDay === today) {
    return current;
  }
  return {
    coins: current.coins,
    ...feedingFields(0, today),
  };
}

/**
 * Apply one session to reward totals.
 * Feeding day is the session endTime in `timeZone`, not `now`.
 */
export function applySessionRewards(
  current: RewardState,
  session: SessionRewardInput,
  now: Date,
  timeZone: string,
): RewardState {
  void now;

  if (session.status !== "Completed") {
    return current;
  }

  const sessionDay = feedingDayOf(session.endTime, timeZone);
  const minutesOnSessionDay =
    current.feedingDay === sessionDay ? current.feedingMinutes : 0;
  const addedMinutes = feedingMinutesFromSession(
    session.status,
    session.durationMinutes,
  );
  const { feedingMinutes } = applyDailyFeedingCap(
    minutesOnSessionDay,
    addedMinutes,
  );

  return {
    coins: current.coins + coinsFromSession(session.status, session.durationMinutes),
    ...feedingFields(feedingMinutes, sessionDay),
  };
}
