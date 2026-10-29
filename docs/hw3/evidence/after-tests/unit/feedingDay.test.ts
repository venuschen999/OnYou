import { describe, expect, it } from "vitest";
import { getFeedingDay } from "../../src/lib/domain/feedingDay";
import { progressForFeedingDay } from "../../src/lib/domain/rewards";

describe("getFeedingDay", () => {
  it("converts the instant to a calendar day in the given IANA timezone", () => {
    const instant = new Date("2026-03-15T07:00:00.000Z");

    expect(getFeedingDay(instant, "UTC")).toBe("2026-03-15");
    expect(getFeedingDay(instant, "America/Los_Angeles")).toBe("2026-03-15");
    expect(getFeedingDay(instant, "Pacific/Auckland")).toBe("2026-03-15");
  });

  it("can assign different feeding days for the same UTC instant in different timezones", () => {
    const instant = new Date("2026-03-16T06:00:00.000Z");

    expect(getFeedingDay(instant, "UTC")).toBe("2026-03-16");
    expect(getFeedingDay(instant, "America/Los_Angeles")).toBe("2026-03-15");
    expect(getFeedingDay(instant, "Asia/Tokyo")).toBe("2026-03-16");
  });

  it("uses the session endTime, so a session that started on the previous calendar day counts on the end day", () => {
    const startTime = new Date("2026-03-15T23:50:00.000Z");
    const endTime = new Date(startTime.getTime() + 25 * 60 * 1000);

    expect(getFeedingDay(startTime, "UTC")).toBe("2026-03-15");
    expect(getFeedingDay(endTime, "UTC")).toBe("2026-03-16");
  });
});

describe("progressForFeedingDay", () => {
  it("keeps apples and feeding minutes on the same feeding day", () => {
    const now = new Date("2026-03-15T18:00:00.000Z");
    const stored = {
      coins: 30,
      feedingMinutes: 30,
      feedingDay: "2026-03-15",
    };

    expect(progressForFeedingDay(stored, now, "UTC")).toEqual({
      coins: 30,
      feedingMinutes: 30,
      apples: 1,
      feedingDay: "2026-03-15",
    });
  });

  it("resets apples and feeding minutes at midnight in the user timezone and leaves coins unchanged", () => {
    const now = new Date("2026-03-16T08:00:00.000Z");
    const stored = {
      coins: 55,
      feedingMinutes: 50,
      feedingDay: "2026-03-15",
    };

    expect(progressForFeedingDay(stored, now, "UTC")).toEqual({
      coins: 55,
      feedingMinutes: 0,
      apples: 0,
      feedingDay: "2026-03-16",
    });
  });
});
