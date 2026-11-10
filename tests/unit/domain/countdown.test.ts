import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatCountdownAnnouncement,
  formatEndClock,
  remainingMilliseconds,
} from "@/lib/domain/countdown";

const END = new Date("2026-11-09T15:25:00.000Z");

describe("countdown from the server end time (US5, #13)", () => {
  it("measures remaining time from endTime and the caller clock", () => {
    const now = new Date("2026-11-09T15:06:18.000Z");

    expect(remainingMilliseconds(END, now)).toBe((18 * 60 + 42) * 1000);
  });

  it("stays at zero after the scheduled end instead of counting past it", () => {
    const now = new Date("2026-11-09T15:40:00.000Z");

    expect(remainingMilliseconds(END, now)).toBe(0);
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdownAnnouncement(0)).toBe("0 minutes remaining");
  });

  it("formats the visible countdown and the minute announcement", () => {
    const remaining = (18 * 60 + 42) * 1000;

    expect(formatCountdown(remaining)).toBe("18:42");
    expect(formatCountdownAnnouncement(remaining)).toBe(
      "18 minutes 42 seconds remaining",
    );
    expect(formatCountdown(15 * 60 * 1000)).toBe("15:00");
  });

  it("formats the scheduled end in the saved timezone", () => {
    expect(formatEndClock(END, "UTC")).toBe("3:25 PM");
    expect(formatEndClock(END, "America/New_York")).toBe("10:25 AM");
  });
});
