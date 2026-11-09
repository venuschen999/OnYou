import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRESENCE_GRACE_SECONDS,
  decidePresence,
  presenceDeadline,
} from "@/lib/domain/presence";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const START = new Date("2026-11-09T15:00:00.000Z");
const END = new Date(START.getTime() + 25 * MS_PER_MINUTE);

function at(offsetMs: number, from: Date = START): Date {
  return new Date(from.getTime() + offsetMs);
}

describe("presence deadline (PRD v2.9 §5.2, #12)", () => {
  it("uses a 30 second grace period", () => {
    expect(PRESENCE_GRACE_SECONDS).toBe(30);
  });

  it("sets the deadline exactly 30 seconds after the latest accepted heartbeat", () => {
    const heartbeat = at(10 * MS_PER_MINUTE);
    expect(presenceDeadline(heartbeat).toISOString()).toBe(
      at(10 * MS_PER_MINUTE + 30 * MS_PER_SECOND).toISOString(),
    );
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

describe("decidePresence before the scheduled end (PRD v2.9 §5.2, #12)", () => {
  const heartbeat = START;

  it("stays active one millisecond before the deadline", () => {
    const now = at(30 * MS_PER_SECOND - 1);
    expect(
      decidePresence({ endTime: END, lastHeartbeatAt: heartbeat, now }),
    ).toBe("ACTIVE");
  });

  it("abandons when the deadline is reached and that deadline is before the end", () => {
    const now = at(30 * MS_PER_SECOND);
    expect(
      decidePresence({ endTime: END, lastHeartbeatAt: heartbeat, now }),
    ).toBe("ABANDON");
  });

  it("stays active when the deadline is after the end and the end has not arrived", () => {
    const lastHeartbeatAt = at(
      END.getTime() - START.getTime() - 10 * MS_PER_SECOND,
    );
    const now = at(END.getTime() - START.getTime() - 1);
    expect(decidePresence({ endTime: END, lastHeartbeatAt, now })).toBe(
      "ACTIVE",
    );
  });
});

describe("decidePresence at and after the scheduled end (PRD v2.9 §5.3, #12)", () => {
  it("abandons when the deadline is exactly the scheduled end", () => {
    const lastHeartbeatAt = at(-30 * MS_PER_SECOND, END);
    expect(decidePresence({ endTime: END, lastHeartbeatAt, now: END })).toBe(
      "ABANDON",
    );
  });

  it("abandons a missed deadline even when the request arrives after the end", () => {
    const lastHeartbeatAt = START;
    const now = at(26 * MS_PER_MINUTE);
    expect(decidePresence({ endTime: END, lastHeartbeatAt, now })).toBe(
      "ABANDON",
    );
  });

  it("is eligible to complete when the deadline is strictly after the end", () => {
    const lastHeartbeatAt = at(-10 * MS_PER_SECOND, END);
    expect(decidePresence({ endTime: END, lastHeartbeatAt, now: END })).toBe(
      "ELIGIBLE_TO_COMPLETE",
    );
  });

  it("stays eligible to complete when resolution happens on a later day", () => {
    const lastHeartbeatAt = at(-10 * MS_PER_SECOND, END);
    const now = at(2 * 24 * 60 * MS_PER_MINUTE, END);
    expect(decidePresence({ endTime: END, lastHeartbeatAt, now })).toBe(
      "ELIGIBLE_TO_COMPLETE",
    );
  });
});
