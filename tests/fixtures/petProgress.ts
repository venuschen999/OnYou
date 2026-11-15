import type { PetProgress } from "@/lib/domain/dashboard";

// Mockup screens for Home. These are test fixtures, not a pet API response.
// GET /api/pet is issue #19 and is not implemented.

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
