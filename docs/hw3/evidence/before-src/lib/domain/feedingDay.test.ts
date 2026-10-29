import { describe, expect, it } from "vitest";
import { feedingDayOf } from "./feedingDay";

describe("feedingDayOf", () => {
  it("converts an instant to YYYY-MM-DD in the given IANA timezone", () => {
    const instant = new Date("2026-01-16T07:30:00.000Z");

    expect(feedingDayOf(instant, "UTC")).toBe("2026-01-16");
    expect(feedingDayOf(instant, "America/Los_Angeles")).toBe("2026-01-15");
    expect(feedingDayOf(instant, "Asia/Tokyo")).toBe("2026-01-16");
  });

  it("uses the calendar day of endTime, not a later now", () => {
    const endTime = new Date("2026-01-15T23:59:00-08:00");
    const now = new Date("2026-01-16T12:00:00-08:00");

    expect(feedingDayOf(endTime, "America/Los_Angeles")).toBe("2026-01-15");
    expect(feedingDayOf(now, "America/Los_Angeles")).toBe("2026-01-16");
  });

  it("changes feeding day at local midnight", () => {
    const before = new Date("2026-01-16T07:59:59.000Z");
    const after = new Date("2026-01-16T08:00:00.000Z");

    expect(feedingDayOf(before, "America/Los_Angeles")).toBe("2026-01-15");
    expect(feedingDayOf(after, "America/Los_Angeles")).toBe("2026-01-16");
  });
});
