import {
  APPLE_MINUTES,
  MAX_APPLES_PER_DAY,
  MAX_FEEDING_MINUTES_PER_DAY,
  calculateRewards,
} from "./rewards";

// #72: what finishing a session of each duration would earn today. It runs
// the same calculateRewards the server uses, so a hint never promises more
// than completion gives (PRD v2.9 §6).

// Today's progress as GET /api/pet reports it (pet.md P4).
export type TodayFeeding = {
  applesToday: number;
  feedingMinutesTowardNextApple: number;
};

export type DurationPreview = {
  coins: number;
  applesEarned: number;
  feedingMinutesEarned: number;
};

// Rebuilds the day's stored minutes from apples plus leftover; a Full day is
// at the 50-minute cap.
function feedingMinutesToday(today: TodayFeeding): number {
  if (today.applesToday >= MAX_APPLES_PER_DAY) {
    return MAX_FEEDING_MINUTES_PER_DAY;
  }
  return Math.min(
    MAX_FEEDING_MINUTES_PER_DAY,
    today.applesToday * APPLE_MINUTES + today.feedingMinutesTowardNextApple,
  );
}

export function previewDurationRewards(
  durationMinutes: number,
  today: TodayFeeding,
): DurationPreview {
  const rewards = calculateRewards({
    status: "COMPLETED",
    durationMinutes,
    feedingBefore: {
      feedingMinutes: feedingMinutesToday(today),
      apples: today.applesToday,
    },
  });
  return {
    coins: rewards.coinsEarned,
    applesEarned: rewards.applesEarned,
    feedingMinutesEarned: rewards.feedingMinutesEarned,
  };
}

export function coinHint(durationMinutes: number): string {
  return `+${durationMinutes} coins`;
}

export function appleHint(preview: DurationPreview): string {
  if (preview.applesEarned > 0) {
    return `+${preview.applesEarned} ${preview.applesEarned === 1 ? "apple" : "apples"}`;
  }
  if (preview.feedingMinutesEarned > 0) {
    return `${preview.feedingMinutesEarned} min toward an apple`;
  }
  return "Full today";
}

export type RewardSummary = { lead: string; detail: string };

// Product decision in #72: the line under the duration cards.
export function rewardSummary(
  petName: string,
  applesToday: number,
): RewardSummary {
  if (applesToday >= MAX_APPLES_PER_DAY) {
    return {
      lead: `${petName} is full today!`,
      detail: "Focus still earns a coin per minute.",
    };
  }
  return {
    lead: `${petName} needs ${MAX_APPLES_PER_DAY} apples to be full today!`,
    detail: `Every ${APPLE_MINUTES} minutes of finished focus feeds one apple, and each minute earns a coin.`,
  };
}
