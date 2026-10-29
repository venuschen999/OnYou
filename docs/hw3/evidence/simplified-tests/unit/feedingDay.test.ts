import { describe, expect, it } from "vitest";
import { feedingDay } from "../../src/lib/domain/feedingDay";

describe("feeding day", () => {
  it("uses the calendar date of the instant in the given IANA timezone", () => {
    const instant = new Date("2026-10-28T06:59:00.000Z");

    expect(feedingDay(instant, "America/Los_Angeles")).toBe("2026-10-27");
    expect(feedingDay(instant, "UTC")).toBe("2026-10-28");
    expect(feedingDay(instant, "Asia/Tokyo")).toBe("2026-10-28");
  });

  it("rolls to the next local date at midnight in that timezone", () => {
    const beforeMidnight = new Date("2026-10-28T06:59:00.000Z");
    const atMidnight = new Date("2026-10-28T07:00:00.000Z");

    expect(feedingDay(beforeMidnight, "America/Los_Angeles")).toBe("2026-10-27");
    expect(feedingDay(atMidnight, "America/Los_Angeles")).toBe("2026-10-28");
  });
});
