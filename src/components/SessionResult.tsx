"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { PetArt, type PetBowl } from "@/components/PetArt";
import { Button } from "@/components/ui/Button";
import type { FocusSessionView, SessionPetView } from "@/lib/api/sessions";
import type { FeedingState } from "@/lib/domain/rewards";
import {
  feedingStateLabel,
  petResultAlt,
  sessionResultMessage,
} from "@/lib/domain/sessionResult";
import { ROUTES } from "@/lib/routes";

type SessionResultProps = {
  session: FocusSessionView;
  onStartAnother: () => void;
};

const PRIMARY_LINK =
  "block w-full rounded-[14px] bg-primary px-[22px] py-[13px] text-center font-bold text-primary-foreground no-underline sm:inline-block sm:w-auto";

function rewardAmount(amount: number): string {
  return amount > 0 ? `+${amount}` : "0";
}

function appleLabel(amount: number): string {
  return amount === 1 ? "apple" : "apples";
}

function bowlFor(apples: number): PetBowl {
  if (apples >= 2) return 2;
  if (apples === 1) return 1;
  return 0;
}

function RewardTile({
  amount,
  label,
  muted,
}: {
  amount: number;
  label: string;
  muted: boolean;
}): ReactElement {
  return (
    <div className="rounded-[18px] border border-line bg-surface px-2 py-3 text-center sm:px-3.5">
      <b
        className={`countdown-digits block text-2xl sm:text-[1.8rem] ${muted ? "text-muted" : ""}`}
      >
        {rewardAmount(amount)}
      </b>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

function visualState(state: FeedingState): "starving" | "hungry" | "full" {
  const label = feedingStateLabel(state).toLowerCase();
  if (label === "hungry" || label === "full") return label;
  return "starving";
}

function CompletedPet({ pet }: { pet: SessionPetView }): ReactElement {
  const state = pet.feedingState;
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-surface px-4 py-7 sm:px-7">
      <div className="w-[130px] sm:w-44">
        <PetArt
          state={visualState(state)}
          bowl={bowlFor(pet.apples)}
          label={petResultAlt(pet.name, state)}
        />
      </div>
      <span
        className={`rounded-full bg-tint px-3 py-0.5 text-sm font-bold ${
          state === "FULL"
            ? "text-primary"
            : state === "STARVING"
              ? "text-danger"
              : "text-foreground"
        }`}
      >
        {feedingStateLabel(state)}
      </span>
    </div>
  );
}

export function SessionResult({
  session,
  onStartAnother,
}: SessionResultProps): ReactElement {
  const abandoned = session.status === "ABANDONED";
  const message =
    !abandoned && session.pet
      ? sessionResultMessage({
          petName: session.pet.name,
          feedingState: session.pet.feedingState,
          applesEarned: session.applesEarned,
          durationMinutes: session.durationMinutes,
          feedingMinutesEarned: session.feedingMinutesEarned,
          minutesUntilNextApple: session.pet.minutesUntilNextApple,
        })
      : null;
  const summary = abandoned
    ? `${session.taskName}, ${session.durationMinutes} minutes. The session was given up, or no OnYou tab was connected for 30 seconds.`
    : `${session.taskName}, ${session.durationMinutes} minutes`;

  return (
    <div className="mx-auto grid w-full max-w-[860px] items-center gap-4 min-[601px]:grid-cols-[300px_minmax(0,1fr)] min-[601px]:gap-14">
      {abandoned ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-surface px-4 py-7 sm:px-7">
          <div className="pet-slap w-[130px] sm:w-44">
            <PetArt state="slapped" label="Mochi got slapped" />
          </div>
        </div>
      ) : session.pet ? (
        <CompletedPet pet={session.pet} />
      ) : (
        <div />
      )}
      <div className="flex flex-col gap-4">
        <h1 className="m-0 text-[1.4rem] font-extrabold min-[601px]:text-[1.75rem]">
          {abandoned ? "Session ended early" : "Session complete"}
        </h1>
        <p className="m-0 text-muted">{summary}</p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <RewardTile
            amount={session.coinsEarned}
            label="coins"
            muted={abandoned}
          />
          <RewardTile
            amount={session.feedingMinutesEarned}
            label="feeding minutes"
            muted={abandoned}
          />
          <RewardTile
            amount={session.applesEarned}
            label={appleLabel(session.applesEarned)}
            muted={abandoned}
          />
        </div>
        {abandoned ? (
          <p className="m-0 text-muted">
            No rewards this time. Apples and coins from earlier sessions are
            unchanged.
          </p>
        ) : null}
        {message ? <p className="m-0 text-muted">{message}</p> : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={ROUTES.home} className={PRIMARY_LINK}>
            Back to dashboard
          </Link>
          {abandoned ? null : (
            <Button variant="secondary" onClick={onStartAnother}>
              Start another session
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
