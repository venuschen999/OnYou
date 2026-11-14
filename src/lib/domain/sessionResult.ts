import {
  FeedingState,
  type FeedingState as FeedingStateName,
} from "@/lib/domain/rewards";

// Display copy for the session result screen (OnYou_web_mockups.html, US6).
// Inputs are the server's stored rewards and pet snapshot. This does not
// calculate coins, apples, or feeding minutes.
export type SessionResultCopy = {
  petName: string;
  feedingState: FeedingStateName;
  applesEarned: number;
  durationMinutes: number;
  feedingMinutesEarned: number;
  minutesUntilNextApple: number;
};

function minuteLabel(count: number): string {
  return count === 1 ? "minute" : "minutes";
}

export function sessionResultMessage(input: SessionResultCopy): string | null {
  const discarded = input.durationMinutes - input.feedingMinutesEarned;
  if (
    discarded > 0 &&
    input.feedingMinutesEarned > 0 &&
    input.feedingState === FeedingState.FULL
  ) {
    return `${input.petName} is full for today. ${discarded} ${minuteLabel(discarded)} went past the 50-minute daily limit, so they don\u2019t count toward apples.`;
  }
  if (
    input.feedingState === FeedingState.FULL &&
    input.feedingMinutesEarned === 0 &&
    input.applesEarned === 0
  ) {
    return `${input.petName} was already full today, so this session earns coins only. Apples start again at midnight.`;
  }
  if (
    input.applesEarned === 0 &&
    input.feedingState === FeedingState.STARVING &&
    input.minutesUntilNextApple > 0
  ) {
    const remaining = input.minutesUntilNextApple;
    return `${remaining} more ${minuteLabel(remaining)} of focus today earns ${input.petName}\u2019s first apple.`;
  }
  return null;
}

export function feedingStateLabel(state: FeedingStateName): string {
  if (state === FeedingState.FULL) return "Full";
  if (state === FeedingState.HUNGRY) return "Hungry";
  return "Starving";
}

export function petResultAlt(name: string, state: FeedingStateName): string {
  return `${name} is ${feedingStateLabel(state).toLowerCase()}`;
}
