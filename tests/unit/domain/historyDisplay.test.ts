import { describe, expect, it } from "vitest";
import {
  compareHistoryNewestFirst,
  formatHistoryCoins,
  formatHistoryDuration,
  formatHistoryFeeding,
  formatHistoryWhen,
  historyEndNote,
  historyOutcomeLabel,
} from "@/lib/domain/historyDisplay";

const TIME_ZONE = "America/New_York";
const NOW = new Date("2026-11-09T22:00:00.000Z");

describe("history display (US8, #23)", () => {
  it("shows Today and the clock for a session on the same local day", () => {
    const startedAt = new Date("2026-11-09T20:00:00.000Z");

    expect(formatHistoryWhen(startedAt, NOW, TIME_ZONE)).toBe("Today, 3:00 PM");
  });

  it("shows the weekday, month, day, and clock for another day", () => {
    const startedAt = new Date("2026-10-26T20:15:00.000Z");

    expect(formatHistoryWhen(startedAt, NOW, TIME_ZONE)).toBe(
      "Mon Oct 26, 4:15 PM",
    );
  });

  it("names the oldest session in the end-of-list note", () => {
    expect(historyEndNote(new Date("2026-10-19T23:45:00.000Z"), TIME_ZONE)).toBe(
      "That’s every session. Your first one was on Mon Oct 19.",
    );
  });

  it("uses the screen labels for outcome, duration, and rewards", () => {
    expect(historyOutcomeLabel("COMPLETED")).toBe("Completed");
    expect(historyOutcomeLabel("ABANDONED")).toBe("Abandoned");
    expect(formatHistoryDuration(25)).toBe("25 min");
    expect(formatHistoryCoins(25)).toBe("+25 coins");
    expect(formatHistoryFeeding(15)).toBe("+15 feeding min");
  });

  it("orders equal start times by id descending", () => {
    const startedAt = "2026-11-07T15:00:00.000Z";
    const entries = [
      { id: "hist_a", startedAt },
      { id: "hist_c", startedAt },
      { id: "hist_b", startedAt },
    ];

    expect(
      [...entries].sort(compareHistoryNewestFirst).map((entry) => entry.id),
    ).toEqual(["hist_c", "hist_b", "hist_a"]);
  });
});
