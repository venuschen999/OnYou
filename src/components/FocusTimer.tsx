"use client";

import { PetArt } from "@/components/PetArt";
import { Button } from "@/components/ui/Button";
import { useCountdown } from "@/hooks/useCountdown";
import { formatEndClock } from "@/lib/domain/countdown";
import type { FocusSessionView } from "@/lib/api/sessions";

const RING_RADIUS = 112;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type FocusTimerProps = {
  session: FocusSessionView;
};

function displayTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function FocusTimer({ session }: FocusTimerProps) {
  const countdown = useCountdown(session.endTime);
  const announcement =
    countdown.minutesLeft === 1
      ? "1 minute remaining"
      : `${countdown.minutesLeft} minutes remaining`;
  const endClock = formatEndClock(new Date(session.endTime), displayTimeZone());
  const totalMs = session.durationMinutes * 60 * 1000;
  const progress =
    totalMs === 0 ? 0 : Math.min(1, countdown.remainingMs / totalMs);
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="mx-auto grid w-full max-w-4xl items-center gap-10 max-[600px]:justify-items-center max-[600px]:text-center min-[601px]:grid-cols-[320px_minmax(0,1fr)]">
      <div className="relative h-80 w-80 max-[600px]:h-[250px] max-[600px]:w-[250px]">
        <svg
          className="absolute inset-0"
          viewBox="0 0 250 250"
          aria-hidden="true"
        >
          <circle
            cx="125"
            cy="125"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--tint)"
            strokeWidth="9"
          />
          <circle
            cx="125"
            cy="125"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--pine)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 125 125)"
          />
        </svg>
        <div className="absolute top-16 left-16 w-48 max-[600px]:top-12 max-[600px]:left-12 max-[600px]:w-36">
          <PetArt label="Mochi is waiting" />
        </div>
      </div>
      <div className="flex flex-col items-start gap-2.5 max-[600px]:items-center">
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <div
          className="countdown-digits text-6xl leading-none font-bold max-[600px]:text-5xl"
          aria-label={countdown.label}
        >
          {countdown.text}
        </div>
        <h1 className="m-0 text-xl font-bold">{session.taskName}</h1>
        <p className="m-0 text-muted">
          {session.durationMinutes} minutes, ends at {endClock}
        </p>
        <p className="m-0 max-w-prose text-muted">
          This session shows in every OnYou tab you have open. Keep at least one
          open until {endClock}.
        </p>
        {/* TODO(#17): open the Give up confirmation. The control is part of the running session. */}
        <Button variant="danger" className="mt-3">
          Give up
        </Button>
      </div>
    </div>
  );
}
