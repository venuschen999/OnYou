"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { PetArt } from "@/components/PetArt";
import { PetCard } from "@/components/PetCard";
import { Button } from "@/components/ui/Button";
import type { FocusSessionView } from "@/lib/api/sessions";
import { dashboardCopy, type PetProgress } from "@/lib/domain/dashboard";
import { ROUTES } from "@/lib/routes";

export type DashboardStatus = "loading" | "ready" | "error";

export type DashboardViewProps = {
  status: DashboardStatus;
  pet?: PetProgress | null;
  activeSession?: FocusSessionView | null;
  onRetry?: () => void;
};

const START_CLASS =
  "block w-full rounded-[14px] bg-primary px-[22px] py-[13px] text-center font-bold text-primary-foreground no-underline min-[601px]:inline-block min-[601px]:w-auto";

function StartFocus({ disabled }: { disabled: boolean }): ReactElement {
  if (!disabled) {
    return (
      <Link href={ROUTES.focus} className={START_CLASS}>
        Start focusing
      </Link>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled
        aria-describedby="one-session"
        className={`${START_CLASS} cursor-not-allowed opacity-50`}
      >
        Start focusing
      </button>
      <p
        id="one-session"
        className="m-0 text-center text-[0.84rem] text-muted min-[601px]:text-left"
      >
        One session at a time. Finish or give up the current one first.
      </p>
    </div>
  );
}

export function DashboardLoading(): ReactElement {
  return (
    <div data-testid="dashboard-loading" aria-busy="true">
      <h1 className="sr-only">Loading your dashboard</h1>
      <div
        aria-hidden="true"
        className="mx-auto grid w-full max-w-[900px] gap-[18px] max-[600px]:grid-cols-1 min-[601px]:grid-cols-[380px_minmax(0,1fr)] min-[601px]:gap-12"
      >
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-surface p-7">
          <div className="dashboard-skeleton size-[170px] rounded-full motion-reduce:animate-none" />
          <div className="dashboard-skeleton h-[22px] w-[110px] motion-reduce:animate-none" />
          <div className="dashboard-skeleton h-[22px] w-20 rounded-full motion-reduce:animate-none" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="dashboard-skeleton h-8 w-4/5 motion-reduce:animate-none" />
          <div className="dashboard-skeleton h-[18px] w-3/5 motion-reduce:animate-none" />
          <div className="grid grid-cols-2 gap-3">
            <div className="dashboard-skeleton h-28 rounded-[18px] motion-reduce:animate-none" />
            <div className="dashboard-skeleton h-28 rounded-[18px] motion-reduce:animate-none" />
          </div>
          <div className="dashboard-skeleton h-12 w-40 rounded-[14px] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}

export function DashboardError({
  onRetry,
}: {
  onRetry: () => void;
}): ReactElement {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 text-center"
    >
      <div className="w-[180px] max-[600px]:w-[150px]">
        <PetArt state="hungry" label="Mochi is waiting" />
      </div>
      <h1 className="m-0 text-[1.4rem] font-extrabold min-[601px]:text-[1.75rem]">
        Couldn’t load your dashboard
      </h1>
      <p className="m-0 text-muted">
        Check your internet connection and try again. Your pet, coins, and
        sessions are saved.
      </p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

function ReadyDashboard({
  pet,
  activeSession,
}: {
  pet: PetProgress;
  activeSession: FocusSessionView | null;
}): ReactElement {
  const active =
    activeSession?.status === "ACTIVE"
      ? { durationMinutes: activeSession.durationMinutes }
      : null;
  const copy = dashboardCopy(pet, active);
  return (
    <section
      data-testid="dashboard"
      className="mx-auto grid w-full max-w-[900px] items-center gap-[18px] [grid-template-areas:'pet'_'status'_'stats'_'action'] max-[600px]:grid-cols-1 min-[601px]:grid-cols-[380px_minmax(0,1fr)] min-[601px]:gap-12 min-[601px]:[grid-template-areas:'pet_status'_'pet_stats'_'pet_action']"
    >
      <PetCard pet={pet}>
        <div className="flex flex-col gap-3.5 [grid-area:status] min-[601px]:gap-5">
          <h1 className="m-0 text-[1.4rem] font-extrabold min-[601px]:text-[1.75rem]">
            {copy.title}
          </h1>
          <p className="m-0 text-muted">{copy.subtitle}</p>
        </div>
      </PetCard>
      <div className="[grid-area:action]">
        <StartFocus disabled={active !== null} />
      </div>
    </section>
  );
}

export function DashboardView({
  status,
  pet = null,
  activeSession = null,
  onRetry,
}: DashboardViewProps): ReactElement {
  if (status === "loading") return <DashboardLoading />;
  if (status !== "ready" || !pet) {
    return <DashboardError onRetry={onRetry ?? (() => undefined)} />;
  }
  return <ReadyDashboard pet={pet} activeSession={activeSession ?? null} />;
}
