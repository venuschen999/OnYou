"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { HistoryTable } from "@/components/HistoryTable";
import { PetArt } from "@/components/PetArt";
import { Button } from "@/components/ui/Button";
import {
  compareHistoryNewestFirst,
  historyEndNote,
  type HistoryEntry,
} from "@/lib/domain/historyDisplay";
import { ROUTES } from "@/lib/routes";

export type { HistoryEntry };

const START_LINK =
  "block w-full rounded-[14px] bg-primary px-[22px] py-[13px] text-center font-bold text-primary-foreground no-underline min-[601px]:inline-block min-[601px]:w-auto";

export type HistoryScreenProps =
  | { phase: "loading" }
  | { phase: "error"; onRetry: () => void }
  | {
      phase: "ready";
      entries: HistoryEntry[];
      hasMore: boolean;
      isLoadingMore: boolean;
      timeZone: string;
      now: string;
      onLoadMore: () => void;
    };

function HistoryError({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="m-0 text-3xl font-extrabold">
        Couldn’t load the history screen
      </h1>
      <p role="alert">Check your internet connection and try again.</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  );
}

function HistoryEmpty(): ReactElement {
  return (
    <div className="m-auto flex flex-1 flex-col items-center gap-3 text-center">
      <PetArt state="starving" label="Mochi is waiting" className="w-[180px]" />
      <h1 className="m-0 text-3xl font-extrabold">No sessions yet</h1>
      <p className="m-0 text-muted">
        Finished and abandoned sessions show up here.
      </p>
      <Link href={ROUTES.focus} className={START_LINK}>
        Start focusing
      </Link>
    </div>
  );
}

function HistoryFooter({
  entries,
  hasMore,
  isLoadingMore,
  timeZone,
  onLoadMore,
}: {
  entries: HistoryEntry[];
  hasMore: boolean;
  isLoadingMore: boolean;
  timeZone: string;
  onLoadMore: () => void;
}): ReactElement {
  const oldest = entries.at(-1);
  if (!hasMore && oldest) {
    return (
      <p className="mt-[18px] text-center text-[0.92rem] text-muted">
        {historyEndNote(new Date(oldest.startedAt), timeZone)}
      </p>
    );
  }
  return (
    <Button
      variant="secondary"
      className="mt-[18px] self-center"
      aria-busy={isLoadingMore ? true : undefined}
      disabled={isLoadingMore}
      onClick={onLoadMore}
    >
      {isLoadingMore ? "Loading more sessions…" : "Load more"}
    </Button>
  );
}

export function HistoryScreen(props: HistoryScreenProps): ReactElement {
  if (props.phase === "loading") {
    return <p aria-busy="true">Loading your sessions…</p>;
  }
  if (props.phase === "error") return <HistoryError onRetry={props.onRetry} />;
  if (props.entries.length === 0) return <HistoryEmpty />;

  const entries = [...props.entries].sort(compareHistoryNewestFirst);
  return (
    <div className="flex flex-col">
      <h1 className="m-0 text-3xl font-extrabold">Your sessions</h1>
      <HistoryTable
        entries={entries}
        timeZone={props.timeZone}
        now={props.now}
      />
      <HistoryFooter
        entries={entries}
        hasMore={props.hasMore}
        isLoadingMore={props.isLoadingMore}
        timeZone={props.timeZone}
        onLoadMore={props.onLoadMore}
      />
    </div>
  );
}
