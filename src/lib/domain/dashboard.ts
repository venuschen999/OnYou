import type { PetProgress } from "@/lib/domain/petProgress";
import {
  APPLE_MINUTES,
  FeedingState,
  minutesUntilNextApple,
} from "@/lib/domain/rewards";

export type { PetProgress };

// Home copy from OnYou_web_mockups.html (US4). The fields are GET /api/pet's
// PetProgress (pet.md P4). This module does not fetch them.
// A starving pet that already has minutes uses the "first apple" sentence
// from the session-result mockup; the dashboard mockup only draws 0 minutes.

export type ActiveFocus = {
  durationMinutes: number;
};

export type DashboardCopy = {
  title: string;
  subtitle: string;
};

function clampedToward(minutes: number): number {
  if (minutes < 0) return 0;
  if (minutes > APPLE_MINUTES) return APPLE_MINUTES;
  return minutes;
}

export function feedingProgressLabel(pet: PetProgress): string {
  if (pet.feedingState === FeedingState.FULL) return "Full for today";
  const toward = clampedToward(pet.feedingMinutesTowardNextApple);
  return `${toward} of ${APPLE_MINUTES} min to the next apple`;
}

export function feedingProgressPercent(pet: PetProgress): number {
  if (pet.feedingState === FeedingState.FULL) return 100;
  const toward = clampedToward(pet.feedingMinutesTowardNextApple);
  return Math.round((toward / APPLE_MINUTES) * 100);
}

function minuteLabel(count: number): string {
  return count === 1 ? "minute" : "minutes";
}

function remainingMinutes(pet: PetProgress): number {
  return minutesUntilNextApple(
    pet.feedingMinutesTowardNextApple,
    pet.applesToday,
  );
}

function starvingCopy(pet: PetProgress): DashboardCopy {
  const title = `${pet.name} hasn\u2019t eaten today.`;
  if (pet.feedingMinutesTowardNextApple <= 0) {
    return {
      title,
      subtitle:
        "Finish a session to feed it. Every 25 minutes of focus earns an apple.",
    };
  }
  const remaining = remainingMinutes(pet);
  return {
    title,
    subtitle: `${remaining} more ${minuteLabel(remaining)} of focus earns ${pet.name}\u2019s first apple.`,
  };
}

function hungryCopy(
  pet: PetProgress,
  active: ActiveFocus | null,
): DashboardCopy {
  const title = "One apple down, one to go.";
  const remaining = remainingMinutes(pet);
  if (active !== null && active.durationMinutes >= remaining) {
    return {
      title,
      subtitle: "This session finishing earns the second apple.",
    };
  }
  return {
    title,
    subtitle: `${remaining} more ${minuteLabel(remaining)} of focus earns the second apple.`,
  };
}

export function dashboardCopy(
  pet: PetProgress,
  active: ActiveFocus | null,
): DashboardCopy {
  if (pet.feedingState === FeedingState.FULL) {
    return {
      title: `${pet.name} is full for today.`,
      subtitle:
        "More sessions still earn coins. Apples start again at midnight.",
    };
  }
  if (pet.feedingState === FeedingState.HUNGRY) return hungryCopy(pet, active);
  return starvingCopy(pet);
}
