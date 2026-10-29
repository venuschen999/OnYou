import { getFeedingDay } from "./feedingDay";

export const APPLE_MINUTES = 25;
export const MAX_APPLES_PER_DAY = 2;
export const MAX_FEEDING_MINUTES_PER_DAY = APPLE_MINUTES * MAX_APPLES_PER_DAY;

export type SessionStatus = "COMPLETED" | "ABANDONED";
export type FeedingState = "STARVING" | "HUNGRY" | "FULL";

export type RewardInput = {
  status: SessionStatus;
  durationMinutes: number;
  endTime: Date;
  now: Date;
  timeZone: string;
  currentCoins: number;
  currentFeedingMinutes: number;
};

export type RewardResult = {
  coins: number;
  feedingMinutes: number;
  apples: number;
  leftoverMinutes: number;
  discardedMinutes: number;
  feedingState: FeedingState;
  feedingDay: string;
};

export type StoredFeedingProgress = {
  coins: number;
  feedingMinutes: number;
  feedingDay: string;
};

export type FeedingDayProgress = StoredFeedingProgress & {
  apples: number;
};

export function coinsEarned(
  status: SessionStatus,
  durationMinutes: number,
): number {
  if (status !== "COMPLETED") {
    return 0;
  }

  return durationMinutes;
}

export function applesFromFeedingMinutes(feedingMinutes: number): number {
  return Math.min(
    Math.floor(feedingMinutes / APPLE_MINUTES),
    MAX_APPLES_PER_DAY,
  );
}

export function leftoverMinutes(feedingMinutes: number): number {
  return feedingMinutes % APPLE_MINUTES;
}

export function feedingStateFromApples(apples: number): FeedingState {
  if (apples <= 0) {
    return "STARVING";
  }

  if (apples === 1) {
    return "HUNGRY";
  }

  return "FULL";
}

export function calculateRewards(input: RewardInput): RewardResult {
  // US6: credit the feeding day of scheduled endTime, even if now is later.
  const feedingDay = getFeedingDay(input.endTime, input.timeZone);

  if (input.status !== "COMPLETED") {
    return totalsFrom(
      input.currentCoins,
      input.currentFeedingMinutes,
      0,
      feedingDay,
    );
  }

  const coins = input.currentCoins + input.durationMinutes;
  const uncappedMinutes = input.currentFeedingMinutes + input.durationMinutes;
  const feedingMinutes = Math.min(
    uncappedMinutes,
    MAX_FEEDING_MINUTES_PER_DAY,
  );
  const discardedMinutes = uncappedMinutes - feedingMinutes;

  return totalsFrom(coins, feedingMinutes, discardedMinutes, feedingDay);
}

export function progressForFeedingDay(
  stored: StoredFeedingProgress,
  now: Date,
  timeZone: string,
): FeedingDayProgress {
  const feedingDay = getFeedingDay(now, timeZone);

  if (stored.feedingDay === feedingDay) {
    return {
      coins: stored.coins,
      feedingMinutes: stored.feedingMinutes,
      apples: applesFromFeedingMinutes(stored.feedingMinutes),
      feedingDay,
    };
  }

  // US6: daily reset clears apples and feeding minutes; coins never reset.
  return {
    coins: stored.coins,
    feedingMinutes: 0,
    apples: 0,
    feedingDay,
  };
}

function totalsFrom(
  coins: number,
  feedingMinutes: number,
  discardedMinutes: number,
  feedingDay: string,
): RewardResult {
  const apples = applesFromFeedingMinutes(feedingMinutes);

  return {
    coins,
    feedingMinutes,
    apples,
    leftoverMinutes: leftoverMinutes(feedingMinutes),
    discardedMinutes,
    feedingState: feedingStateFromApples(apples),
    feedingDay,
  };
}
