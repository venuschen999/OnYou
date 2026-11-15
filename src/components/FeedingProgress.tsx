import type { ReactElement } from "react";
import {
  feedingProgressLabel,
  feedingProgressPercent,
  type PetProgress,
} from "@/lib/domain/dashboard";
import {
  APPLE_MINUTES,
  FeedingState,
  MAX_APPLES_PER_DAY,
} from "@/lib/domain/rewards";

// Apple glyph from OnYou_web_mockups.html. Stroke versus fill keeps an empty
// apple visible without relying on color alone; the group label states the count.
const APPLE_OUTLINE =
  "M12 7c-2-1.6-6-1.4-7 2.5-.9 3.6 1.6 9.5 4.4 9.5 1.2 0 1.6-.6 2.6-.6s1.4.6 2.6.6c2.8 0 5.3-5.9 4.4-9.5C18 5.6 14 5.4 12 7z";

function AppleIcon({ filled }: { filled: boolean }): ReactElement {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={APPLE_OUTLINE}
        fill={filled ? "var(--apple)" : "none"}
        stroke={filled ? "var(--apple)" : "var(--line)"}
        strokeWidth="1.6"
      />
      <path
        d="M12 7c0-2 1-3.5 2.8-4"
        fill="none"
        stroke="var(--leaf)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function shownApples(count: number): number {
  if (count < 0) return 0;
  if (count > MAX_APPLES_PER_DAY) return MAX_APPLES_PER_DAY;
  return count;
}

export function AppleMarks({ count }: { count: number }): ReactElement {
  const shown = shownApples(count);
  return (
    <div
      role="img"
      aria-label={`${shown} of ${MAX_APPLES_PER_DAY} apples`}
      className="mt-1 flex gap-1.5"
    >
      <AppleIcon filled={shown >= 1} />
      <AppleIcon filled={shown >= 2} />
    </div>
  );
}

function progressNow(pet: PetProgress): number {
  if (pet.feedingState === FeedingState.FULL) return APPLE_MINUTES;
  if (pet.feedingMinutesTowardNextApple < 0) return 0;
  if (pet.feedingMinutesTowardNextApple > APPLE_MINUTES) return APPLE_MINUTES;
  return pet.feedingMinutesTowardNextApple;
}

export function FeedingProgress({ pet }: { pet: PetProgress }): ReactElement {
  const label = feedingProgressLabel(pet);
  return (
    <div className="rounded-[18px] border border-line bg-surface p-4">
      <div className="text-[0.84rem] text-muted">Apples today</div>
      <AppleMarks count={pet.applesToday} />
      <div
        role="progressbar"
        aria-label="Feeding progress"
        aria-valuemin={0}
        aria-valuemax={APPLE_MINUTES}
        aria-valuenow={progressNow(pet)}
        aria-valuetext={label}
        className="mt-2.5 h-2 overflow-hidden rounded-full bg-tint"
      >
        <div
          data-fill=""
          className="h-full rounded-full bg-apple"
          style={{ width: `${feedingProgressPercent(pet)}%` }}
        />
      </div>
      <p className="mt-1.5 mb-0 text-[0.82rem] text-muted">{label}</p>
    </div>
  );
}
