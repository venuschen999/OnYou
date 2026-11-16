import type { PetProgress } from "@/lib/domain/dashboard";

// Mockup screens for presentational Home tests. The same fields are what
// GET /api/pet returns (pet.md P4).

export const starvingPet: PetProgress = {
  name: "Mochi",
  coins: 0,
  applesToday: 0,
  feedingMinutesTowardNextApple: 0,
  feedingState: "STARVING",
};

export const hungryPet: PetProgress = {
  name: "Mochi",
  coins: 385,
  applesToday: 1,
  feedingMinutesTowardNextApple: 10,
  feedingState: "HUNGRY",
};

export const fullPet: PetProgress = {
  name: "Mochi",
  coins: 460,
  applesToday: 2,
  feedingMinutesTowardNextApple: 0,
  feedingState: "FULL",
};
