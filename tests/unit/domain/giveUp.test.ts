import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  decideGiveUp,
  elapsedWholeMinutes,
  giveUpMessage,
} from "@/lib/domain/giveUp";
import { PRESENCE_GRACE_SECONDS } from "@/lib/domain/presence";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const START = new Date("2026-11-15T15:00:00.000Z");
const END = new Date(START.getTime() + 25 * MS_PER_MINUTE);
const GRACE_MS = PRESENCE_GRACE_SECONDS * MS_PER_SECOND;

function at(offsetMs: number, from: Date = START): Date {
  return new Date(from.getTime() + offsetMs);
}

describe("decideGiveUp (PRD v2.9 §5.3, US7)", () => {
  it("abandons before the scheduled end, even with fresh presence", () => {
    expect(
      decideGiveUp({
        endTime: END,
        lastHeartbeatAt: at(-5 * MS_PER_SECOND, END),
        now: at(-1, END),
      }),
    ).toBe("ABANDON");
  });

  it("completes at the scheduled end when presence was met", () => {
    expect(
      decideGiveUp({
        endTime: END,
        lastHeartbeatAt: at(-10 * MS_PER_SECOND, END),
        now: END,
      }),
    ).toBe("COMPLETE");
  });

  it("completes after the scheduled end when the deadline is strictly later than the end", () => {
    expect(
      decideGiveUp({
        endTime: END,
        lastHeartbeatAt: at(-GRACE_MS + 1, END),
        now: at(5 * MS_PER_MINUTE, END),
      }),
    ).toBe("COMPLETE");
  });

  it("abandons after the scheduled end when the deadline fell exactly at the end", () => {
    expect(
      decideGiveUp({
        endTime: END,
        lastHeartbeatAt: at(-GRACE_MS, END),
        now: at(MS_PER_MINUTE, END),
      }),
    ).toBe("ABANDON");
  });

  it("abandons after the scheduled end when presence lapsed earlier", () => {
    expect(
      decideGiveUp({
        endTime: END,
        lastHeartbeatAt: at(10 * MS_PER_MINUTE),
        now: at(MS_PER_MINUTE, END),
      }),
    ).toBe("ABANDON");
  });
});

describe("elapsedWholeMinutes", () => {
  it.each([
    [0, 0],
    [59 * MS_PER_SECOND, 0],
    [MS_PER_MINUTE, 1],
    [6 * MS_PER_MINUTE + 59 * MS_PER_SECOND, 6],
  ])("counts %i ms since start as %i whole minutes", (offset, minutes) => {
    expect(elapsedWholeMinutes(START, at(offset))).toBe(minutes);
  });

  it("never returns a negative count when the clock is behind the start", () => {
    expect(elapsedWholeMinutes(START, at(-MS_PER_MINUTE))).toBe(0);
  });
});

// docs/agent-memory/sessions.md S11 (mockup "Give up confirmation", US7).
describe("giveUpMessage", () => {
  it("matches the mockup sentence for several minutes", () => {
    expect(giveUpMessage(6)).toBe(
      "Mochi gets nothing from this session, and the 6 minutes so far won’t count. Earlier progress stays safe. This ends the session in every open tab.",
    );
  });

  it("uses the singular for one minute", () => {
    expect(giveUpMessage(1)).toBe(
      "Mochi gets nothing from this session, and the 1 minute so far won’t count. Earlier progress stays safe. This ends the session in every open tab.",
    );
  });

  it("says the time so far when less than a minute has passed", () => {
    expect(giveUpMessage(0)).toBe(
      "Mochi gets nothing from this session, and the time so far won’t count. Earlier progress stays safe. This ends the session in every open tab.",
    );
  });
});

describe("purity", () => {
  it("does not read the clock or import anything but domain modules", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/domain/giveUp.ts"),
      "utf8",
    );
    expect(source).not.toContain("Date.now");
    expect(source).not.toMatch(/new Date\(\s*\)/);
    expect(source).not.toMatch(/from "(?!\.\/|@\/lib\/domain\/)/);
  });
});
