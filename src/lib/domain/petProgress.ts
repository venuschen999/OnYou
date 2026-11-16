import {
  getFeedingState,
  minutesTowardNextApple,
  type FeedingState,
} from "./rewards";

export type PetProgressInput = {
  name: string;
  coins: number;
  // Today's stored totals; zero when the day has no feeding row yet (US4).
  feedingMinutes: number;
  apples: number;
};

// Same fields as PetProgress in the #20 dashboard (docs/agent-memory/pet.md P4).
export type PetProgress = {
  name: string;
  coins: number;
  applesToday: number;
  feedingMinutesTowardNextApple: number;
  feedingState: FeedingState;
};

export function buildPetProgress(input: PetProgressInput): PetProgress {
  const feedingState = getFeedingState(input.apples);
  return {
    name: input.name,
    coins: input.coins,
    applesToday: input.apples,
    // At the 50-minute cap the remainder is 0, so a Full day shows nothing
    // toward another apple (PRD v2.9 §6).
    feedingMinutesTowardNextApple: minutesTowardNextApple(input.feedingMinutes),
    feedingState,
  };
}
