import { APPLE_MINUTES, MAX_APPLES_PER_DAY, MAX_FEEDING_MINUTES_PER_DAY } from "./constants";
import { feedingDay } from "./feedingDay";
import { feedingStateForApples, type FeedingState } from "./feedingState";
import { SessionStatus, type SessionStatus as SessionStatusValue } from "./sessionStatus";

export type PetRewardState = {
  coins: number;
  feedingDay: string;
  feedingMinutes: number;
  apples: number;
};

export type RewardSession = {
  status: SessionStatusValue;
  durationMinutes: number;
  endTime: Date;
};

export type RewardResult = PetRewardState & {
  leftoverMinutes: number;
  feedingState: FeedingState;
  coinsEarned: number;
  feedingMinutesEarned: number;
  applesEarned: number;
  minutesDiscarded: number;
};

type SessionCredit = {
  state: PetRewardState;
  coinsEarned: number;
  feedingMinutesEarned: number;
  applesEarned: number;
  minutesDiscarded: number;
};

export function emptyRewardState(now: Date, timeZone: string): PetRewardState {
  return {
    coins: 0,
    feedingDay: feedingDay(now, timeZone),
    feedingMinutes: 0,
    apples: 0,
  };
}

export function coinsEarnedForSession(
  status: SessionStatusValue,
  durationMinutes: number,
): number {
  if (status !== SessionStatus.COMPLETED) {
    return 0;
  }
  return durationMinutes;
}

export function applyFeedingMinuteCap(
  currentMinutes: number,
  addedMinutes: number,
): { feedingMinutes: number; minutesCredited: number; minutesDiscarded: number } {
  const room = Math.max(0, MAX_FEEDING_MINUTES_PER_DAY - currentMinutes);
  const minutesCredited = Math.min(addedMinutes, room);
  return {
    feedingMinutes: currentMinutes + minutesCredited,
    minutesCredited,
    minutesDiscarded: addedMinutes - minutesCredited,
  };
}

export function applesForFeedingMinutes(feedingMinutes: number): number {
  return Math.min(MAX_APPLES_PER_DAY, Math.floor(feedingMinutes / APPLE_MINUTES));
}

export function leftoverFeedingMinutes(feedingMinutes: number): number {
  const apples = applesForFeedingMinutes(feedingMinutes);
  return feedingMinutes - apples * APPLE_MINUTES;
}

// §6: midnight in the saved timezone clears apples and feeding minutes. Coins stay.
export function applyDailyReset(
  state: PetRewardState,
  now: Date,
  timeZone: string,
): PetRewardState {
  const today = feedingDay(now, timeZone);
  if (state.feedingDay >= today) {
    return { ...state };
  }
  return {
    coins: state.coins,
    feedingDay: today,
    feedingMinutes: 0,
    apples: 0,
  };
}

export function calculateRewards(
  state: PetRewardState,
  session: RewardSession,
  // US6: callers pass the clock. Feeding credit uses the session endTime, not now.
  now: Date,
  timeZone: string,
): RewardResult {
  const credited = creditSession(state, session, feedingDay(session.endTime, timeZone));
  return toRewardResult(credited);
}

function creditSession(
  state: PetRewardState,
  session: RewardSession,
  sessionDay: string,
): SessionCredit {
  const coinsEarned = coinsEarnedForSession(session.status, session.durationMinutes);
  if (session.status !== SessionStatus.COMPLETED) {
    return zeroCredit(state);
  }

  const coins = state.coins + coinsEarned;
  if (state.feedingDay > sessionDay) {
    return zeroFeedingCredit(state, coins, coinsEarned);
  }

  return addFeedingCredit(state, session, sessionDay, coins, coinsEarned);
}

function zeroCredit(state: PetRewardState): SessionCredit {
  return {
    state,
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
    minutesDiscarded: 0,
  };
}

function zeroFeedingCredit(
  state: PetRewardState,
  coins: number,
  coinsEarned: number,
): SessionCredit {
  return {
    state: { ...state, coins },
    coinsEarned,
    feedingMinutesEarned: 0,
    applesEarned: 0,
    minutesDiscarded: 0,
  };
}

function addFeedingCredit(
  state: PetRewardState,
  session: RewardSession,
  sessionDay: string,
  coins: number,
  coinsEarned: number,
): SessionCredit {
  const sameDay = state.feedingDay === sessionDay;
  const capped = applyFeedingMinuteCap(
    sameDay ? state.feedingMinutes : 0,
    session.durationMinutes,
  );
  const apples = applesForFeedingMinutes(capped.feedingMinutes);
  const previousApples = sameDay ? state.apples : 0;

  return {
    state: {
      coins,
      feedingDay: sessionDay,
      feedingMinutes: capped.feedingMinutes,
      apples,
    },
    coinsEarned,
    feedingMinutesEarned: capped.minutesCredited,
    applesEarned: apples - previousApples,
    minutesDiscarded: capped.minutesDiscarded,
  };
}

function toRewardResult(credited: SessionCredit): RewardResult {
  return {
    ...credited.state,
    leftoverMinutes: leftoverFeedingMinutes(credited.state.feedingMinutes),
    feedingState: feedingStateForApples(credited.state.apples),
    coinsEarned: credited.coinsEarned,
    feedingMinutesEarned: credited.feedingMinutesEarned,
    applesEarned: credited.applesEarned,
    minutesDiscarded: credited.minutesDiscarded,
  };
}
