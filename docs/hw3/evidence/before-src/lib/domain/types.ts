export type SessionStatus = "Completed" | "Abandoned";

export type FeedingState = "Starving" | "Hungry" | "Full";

export type RewardState = {
  coins: number;
  feedingMinutes: number;
  apples: number;
  leftoverMinutes: number;
  feedingState: FeedingState;
  feedingDay: string;
};

export type SessionRewardInput = {
  status: SessionStatus;
  durationMinutes: number;
  endTime: Date;
};
