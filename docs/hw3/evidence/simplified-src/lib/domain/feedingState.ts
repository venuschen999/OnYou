import { MAX_APPLES_PER_DAY } from "./constants";

export const FeedingState = {
  STARVING: "STARVING",
  HUNGRY: "HUNGRY",
  FULL: "FULL",
} as const;

export type FeedingState = (typeof FeedingState)[keyof typeof FeedingState];

const FEEDING_STATE_LABELS: Record<FeedingState, string> = {
  [FeedingState.STARVING]: "Starving",
  [FeedingState.HUNGRY]: "Hungry",
  [FeedingState.FULL]: "Full",
};

export function feedingStateForApples(apples: number): FeedingState {
  if (apples >= MAX_APPLES_PER_DAY) {
    return FeedingState.FULL;
  }
  if (apples > 0) {
    return FeedingState.HUNGRY;
  }
  return FeedingState.STARVING;
}

export function feedingStateLabel(state: FeedingState): string {
  return FEEDING_STATE_LABELS[state];
}
