import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getFeedingDay } from "@/lib/domain/feedingDay";

const NEW_YORK = "America/New_York";
const TOKYO = "Asia/Tokyo";
const MS_PER_MINUTE = 60_000;

describe("feeding day (PRD v2.9 §6, US4)", () => {
  it("uses the user's IANA timezone, not UTC", () => {
    const endTime = new Date("2026-11-03T02:00:00.000Z");

    expect(getFeedingDay(endTime, NEW_YORK)).toBe("2026-11-02");
    expect(getFeedingDay(endTime, TOKYO)).toBe("2026-11-03");
  });

  it("credits a session that crosses midnight to the day it ends", () => {
    // 23:50 to 00:15 in New York (EST, UTC-5).
    const startTime = new Date("2026-11-03T04:50:00.000Z");
    const endTime = new Date(startTime.getTime() + 25 * MS_PER_MINUTE);

    expect(getFeedingDay(endTime, NEW_YORK)).toBe("2026-11-03");
  });

  it("puts an end at exactly midnight on the new day", () => {
    expect(getFeedingDay(new Date("2026-11-03T05:00:00.000Z"), NEW_YORK)).toBe(
      "2026-11-03",
    );
  });

  it("keeps an end one minute before midnight on that day", () => {
    expect(getFeedingDay(new Date("2026-11-03T04:59:00.000Z"), NEW_YORK)).toBe(
      "2026-11-02",
    );
  });

  // US6: resolution time is not an input (docs/agent-memory/rewards.md R1), so
  // a session ending at 23:59 and resolved the next morning stays on its day.
  it("credits a late-resolved session to its scheduled end's day", () => {
    const endTime = new Date("2026-11-04T04:59:00.000Z");

    expect(getFeedingDay(endTime, NEW_YORK)).toBe("2026-11-03");
  });

  it("uses the offset in effect on a daylight-saving change day", () => {
    // New York falls back from EDT (UTC-4) to EST (UTC-5) on 2026-11-01.
    expect(getFeedingDay(new Date("2026-11-02T04:30:00.000Z"), NEW_YORK)).toBe(
      "2026-11-01",
    );
    expect(getFeedingDay(new Date("2026-11-02T05:00:00.000Z"), NEW_YORK)).toBe(
      "2026-11-02",
    );
  });

  it("does not read the clock or import anything", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/domain/feedingDay.ts"),
      "utf8",
    );

    expect(source).not.toContain("Date.now");
    expect(source).not.toMatch(/new Date\(\s*\)/);
    expect(source).not.toMatch(/^import /m);
  });
});
