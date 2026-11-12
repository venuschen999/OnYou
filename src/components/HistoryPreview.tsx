"use client";

import { useState, type ReactElement } from "react";
import { HistoryScreen, type HistoryEntry } from "@/components/HistoryScreen";

const TIME_ZONE = "America/New_York";
const NOW = "2026-11-09T22:00:00.000Z";

const FIRST_PAGE: HistoryEntry[] = [
  {
    id: "preview_completed",
    taskName: "Essay draft: intro",
    startedAt: "2026-11-09T20:00:00.000Z",
    durationMinutes: 25,
    outcome: "COMPLETED",
    coinsEarned: 25,
    feedingMinutesEarned: 25,
  },
  {
    id: "preview_abandoned",
    taskName: "Read chapter 4",
    startedAt: "2026-11-09T16:10:00.000Z",
    durationMinutes: 50,
    outcome: "ABANDONED",
    coinsEarned: 0,
    feedingMinutesEarned: 0,
  },
];

const NEXT_PAGE: HistoryEntry[] = [
  {
    id: "preview_first",
    taskName: "Problem set 5",
    startedAt: "2026-10-19T23:45:00.000Z",
    durationMinutes: 50,
    outcome: "COMPLETED",
    coinsEarned: 50,
    feedingMinutesEarned: 50,
  },
];

type HistoryPreviewProps = { view?: string };

// Development-only sample. The history route does not render this.
export function HistoryPreview({ view }: HistoryPreviewProps): ReactElement {
  const [entries, setEntries] = useState(FIRST_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  if (view === "empty") {
    return (
      <HistoryScreen
        phase="ready"
        entries={[]}
        hasMore={false}
        isLoadingMore={false}
        timeZone={TIME_ZONE}
        now={NOW}
        onLoadMore={() => undefined}
      />
    );
  }
  if (view === "error") {
    return <HistoryScreen phase="error" onRetry={() => undefined} />;
  }
  if (view === "loading") return <HistoryScreen phase="loading" />;

  return (
    <HistoryScreen
      phase="ready"
      entries={entries}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      timeZone={TIME_ZONE}
      now={NOW}
      onLoadMore={() => {
        setIsLoadingMore(true);
        setEntries((current) => [...current, ...NEXT_PAGE]);
        setHasMore(false);
        setIsLoadingMore(false);
      }}
    />
  );
}
