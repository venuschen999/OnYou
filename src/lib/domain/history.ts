// US8: history pages are 20 Completed or Abandoned sessions.
export const HISTORY_PAGE_SIZE = 20;

export type HistoryOutcome = "COMPLETED" | "ABANDONED";

// Abandoned sessions expose zero coins and zero feeding minutes (PRD v2.9 §6).
// This does not change stored rewards; Give up still belongs to issue #17.
export function historyRewards(
  outcome: HistoryOutcome,
  coinsEarned: number,
  feedingMinutesEarned: number,
): { coinsEarned: number; feedingMinutesEarned: number } {
  if (outcome === "ABANDONED") {
    return { coinsEarned: 0, feedingMinutesEarned: 0 };
  }
  return { coinsEarned, feedingMinutesEarned };
}
