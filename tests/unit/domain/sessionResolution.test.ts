import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { planSessionResolution } from "@/lib/domain/presence";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const START = new Date("2026-11-09T15:00:00.000Z");
const END = new Date(START.getTime() + 25 * MS_PER_MINUTE);

function at(offsetMs: number, from: Date = START): Date {
  return new Date(from.getTime() + offsetMs);
}

describe("planSessionResolution (PRD v2.9 §5.2–§5.3, §10, #14)", () => {
  it("renews a heartbeat one millisecond before the deadline", () => {
    expect(
      planSessionResolution({
        endTime: END,
        lastHeartbeatAt: START,
        now: at(30 * MS_PER_SECOND - 1),
      }),
    ).toBe("RENEW");
  });

  it("abandons at the deadline instead of renewing when that deadline is before the end", () => {
    expect(
      planSessionResolution({
        endTime: END,
        lastHeartbeatAt: START,
        now: at(30 * MS_PER_SECOND),
      }),
    ).toBe("ABANDON");
  });

  it("abandons when the deadline is exactly the scheduled end", () => {
    expect(
      planSessionResolution({
        endTime: END,
        lastHeartbeatAt: at(-30 * MS_PER_SECOND, END),
        now: END,
      }),
    ).toBe("ABANDON");
  });

  it("renews at the scheduled end when the deadline is still later", () => {
    expect(
      planSessionResolution({
        endTime: END,
        lastHeartbeatAt: at(-10 * MS_PER_SECOND, END),
        now: END,
      }),
    ).toBe("RENEW");
  });

  it("holds a presence-met session when the request arrives after the deadline", () => {
    expect(
      planSessionResolution({
        endTime: END,
        lastHeartbeatAt: at(-10 * MS_PER_SECOND, END),
        now: at(21 * MS_PER_SECOND, END),
      }),
    ).toBe("HOLD");
  });

  it("does not abandon a presence-met session resolved on a later day", () => {
    expect(
      planSessionResolution({
        endTime: END,
        lastHeartbeatAt: at(-10 * MS_PER_SECOND, END),
        now: at(2 * 24 * 60 * MS_PER_MINUTE, END),
      }),
    ).toBe("HOLD");
  });

  it("abandons when the deadline was not strictly after the end, even if the request is late", () => {
    expect(
      planSessionResolution({
        endTime: END,
        lastHeartbeatAt: START,
        now: at(26 * MS_PER_MINUTE),
      }),
    ).toBe("ABANDON");
  });

  it("does not read the clock", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/domain/presence.ts"),
      "utf8",
    );
    expect(source).not.toContain("Date.now");
    expect(source).not.toMatch(/new Date\(\s*\)/);
  });
});
