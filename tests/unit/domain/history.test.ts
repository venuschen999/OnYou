import { describe, expect, it } from "vitest";
import { HISTORY_PAGE_SIZE, historyRewards } from "@/lib/domain/history";

describe("history rewards (US8, #22)", () => {
  it("exposes zero coins and feeding minutes for an abandoned session", () => {
    expect(historyRewards("ABANDONED", 25, 25)).toEqual({
      coinsEarned: 0,
      feedingMinutesEarned: 0,
    });
  });

  it("keeps stored coins and feeding minutes for a completed session", () => {
    expect(historyRewards("COMPLETED", 50, 0)).toEqual({
      coinsEarned: 50,
      feedingMinutesEarned: 0,
    });
  });
});

describe("history page size (US8, #22)", () => {
  it("is 20 sessions", () => {
    expect(HISTORY_PAGE_SIZE).toBe(20);
  });
});
