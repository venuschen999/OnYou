import type { ReactElement, ReactNode } from "react";
import { FeedingProgress } from "@/components/FeedingProgress";
import { PetArt, type PetBowl, type PetVisualState } from "@/components/PetArt";
import type { PetProgress } from "@/lib/domain/dashboard";
import {
  FeedingState,
  type FeedingState as FeedingStateName,
} from "@/lib/domain/rewards";
import { feedingStateLabel, petResultAlt } from "@/lib/domain/sessionResult";

// Coin from OnYou_web_mockups.html. These fills are the drawing, same as PetArt.
function CoinIcon(): ReactElement {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="#E7B53C"
        stroke="#B9871A"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="5"
        fill="none"
        stroke="#B9871A"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function visualState(state: FeedingStateName): PetVisualState {
  if (state === FeedingState.FULL) return "full";
  if (state === FeedingState.HUNGRY) return "hungry";
  return "starving";
}

function bowlFor(apples: number): PetBowl {
  if (apples >= 2) return 2;
  if (apples >= 1) return 1;
  return 0;
}

function labelTone(state: FeedingStateName): string {
  if (state === FeedingState.FULL) return "text-primary";
  if (state === FeedingState.STARVING) return "text-danger";
  return "text-foreground";
}

type PetCardProps = {
  pet: PetProgress;
  children?: ReactNode;
};

export function PetCard({ pet, children }: PetCardProps): ReactElement {
  const state = pet.feedingState;
  const bowl = bowlFor(pet.applesToday);
  return (
    <>
      <article className="flex flex-col items-center justify-center gap-2 self-center rounded-3xl border border-line bg-surface p-7 [grid-area:pet] max-[600px]:p-[18px]">
        <div
          data-pet-art=""
          data-pet-state={visualState(state)}
          data-bowl={bowl}
          className="w-[220px] max-[600px]:w-[150px]"
        >
          <PetArt
            state={visualState(state)}
            bowl={bowl}
            label={petResultAlt(pet.name, state)}
          />
        </div>
        <p className="m-0 text-[1.4rem] font-extrabold">{pet.name}</p>
        <span
          className={`rounded-full bg-tint px-3 py-0.5 text-sm font-bold ${labelTone(state)}`}
        >
          {feedingStateLabel(state)}
        </span>
      </article>
      {children}
      <div className="grid grid-cols-2 gap-3 [grid-area:stats]">
        <FeedingProgress pet={pet} />
        <div
          aria-label="Coins"
          className="rounded-[18px] border border-line bg-surface p-4"
        >
          <div className="text-[0.84rem] text-muted">Coins</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums">
            <CoinIcon />
            {pet.coins}
          </div>
        </div>
      </div>
    </>
  );
}
