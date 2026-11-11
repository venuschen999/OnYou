// Reward rules (PRD v2.9 §6). Pure: no I/O, no clock.
export const APPLE_MINUTES = 25;
export const MAX_FEEDING_MINUTES_PER_DAY = 50;
export const MAX_APPLES_PER_DAY = 2;

export const FeedingState = {
  STARVING: "STARVING",
  HUNGRY: "HUNGRY",
  FULL: "FULL",
} as const;
export type FeedingState = (typeof FeedingState)[keyof typeof FeedingState];

// Final statuses only; an Active session has no rewards yet.
export type FinalSessionStatus = "COMPLETED" | "ABANDONED";

export type DailyFeedingTotals = {
  feedingMinutes: number;
  apples: number;
};

export type RewardInput = {
  status: FinalSessionStatus;
  durationMinutes: number;
  feedingBefore: DailyFeedingTotals;
};

export type RewardResult = {
  coinsEarned: number;
  feedingMinutesEarned: number;
  applesEarned: number;
  feedingAfter: DailyFeedingTotals;
};

// The caller passes the totals for the session's feeding day (its endTime),
// never today's, so late resolution cannot credit the wrong day (US6).
export function calculateRewards(input: RewardInput): RewardResult {
  const { status, durationMinutes, feedingBefore } = input;

  // US7: abandoning earns nothing and never removes earlier rewards.
  if (status === "ABANDONED") {
    return {
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
      feedingAfter: feedingBefore,
    };
  }

  // Minutes past the daily cap are discarded; coins are not capped.
  const feedingMinutes = Math.min(
    MAX_FEEDING_MINUTES_PER_DAY,
    feedingBefore.feedingMinutes + durationMinutes,
  );
  const apples = calculateApples(feedingMinutes);

  return {
    coinsEarned: durationMinutes,
    feedingMinutesEarned: feedingMinutes - feedingBefore.feedingMinutes,
    applesEarned: apples - feedingBefore.apples,
    feedingAfter: { feedingMinutes, apples },
  };
}

function calculateApples(feedingMinutes: number): number {
  return Math.min(
    MAX_APPLES_PER_DAY,
    Math.floor(feedingMinutes / APPLE_MINUTES),
  );
}

// Leftover minutes carry toward the next apple on the same feeding day.
export function minutesTowardNextApple(feedingMinutes: number): number {
  return feedingMinutes % APPLE_MINUTES;
}

export function getFeedingState(apples: number): FeedingState {
  if (apples >= MAX_APPLES_PER_DAY) return FeedingState.FULL;
  if (apples > 0) return FeedingState.HUNGRY;
  return FeedingState.STARVING;
}
