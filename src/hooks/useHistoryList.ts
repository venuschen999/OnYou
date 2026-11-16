"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryScreenProps } from "@/components/HistoryScreen";
import { listSessionHistory, type HistoryPageView } from "@/lib/api/sessions";
import {
  historyEntryFromSession,
  type HistoryEntry,
} from "@/lib/domain/historyDisplay";

type HistoryPhase = "loading" | "error" | "ready";

type HistoryLoad = {
  phase: HistoryPhase;
  entries: HistoryEntry[];
  nextCursor: string | null;
  isLoadingMore: boolean;
};

const INITIAL_LOAD: HistoryLoad = {
  phase: "loading",
  entries: [],
  nextCursor: null,
  isLoadingMore: false,
};

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function pageEntries(page: HistoryPageView): HistoryEntry[] {
  return page.items.map(historyEntryFromSession);
}

function takeRequest(requestId: { current: number }): number {
  const id = requestId.current + 1;
  requestId.current = id;
  return id;
}

export function useHistoryList(): HistoryScreenProps {
  const [load, setLoad] = useState<HistoryLoad>(INITIAL_LOAD);
  const [now] = useState(() => new Date().toISOString());
  const requestId = useRef(0);
  const cursorRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  const remember = useCallback(
    (page: HistoryPageView, entries: HistoryEntry[]) => {
      cursorRef.current = page.nextCursor;
      loadingMoreRef.current = false;
      return {
        phase: "ready" as const,
        entries,
        nextCursor: page.nextCursor,
        isLoadingMore: false,
      };
    },
    [],
  );

  const fetchFirst = useCallback(
    (id: number) => {
      void listSessionHistory()
        .then((page) => {
          if (requestId.current !== id) return;
          setLoad(remember(page, pageEntries(page)));
        })
        .catch(() => {
          if (requestId.current !== id) return;
          loadingMoreRef.current = false;
          setLoad((current) => ({
            ...current,
            phase: "error",
            isLoadingMore: false,
          }));
        });
    },
    [remember],
  );

  useEffect(() => {
    fetchFirst(takeRequest(requestId));
  }, [fetchFirst]);

  const retry = useCallback(() => {
    loadingMoreRef.current = false;
    setLoad((current) => ({
      ...current,
      phase: "loading",
      isLoadingMore: false,
    }));
    fetchFirst(takeRequest(requestId));
  }, [fetchFirst]);

  const loadMore = useCallback(() => {
    const cursor = cursorRef.current;
    if (!cursor || loadingMoreRef.current) return;
    const id = takeRequest(requestId);
    loadingMoreRef.current = true;
    setLoad((current) => ({ ...current, isLoadingMore: true }));
    void listSessionHistory(cursor)
      .then((page) => {
        if (requestId.current !== id) return;
        setLoad((current) =>
          remember(page, [...current.entries, ...pageEntries(page)]),
        );
      })
      .catch(() => {
        if (requestId.current !== id) return;
        loadingMoreRef.current = false;
        setLoad((current) => ({ ...current, isLoadingMore: false }));
      });
  }, [remember]);

  if (load.phase === "loading") return { phase: "loading" };
  if (load.phase === "error") return { phase: "error", onRetry: retry };
  return {
    phase: "ready",
    entries: load.entries,
    hasMore: load.nextCursor !== null,
    isLoadingMore: load.isLoadingMore,
    timeZone: browserTimeZone(),
    now,
    onLoadMore: loadMore,
  };
}
