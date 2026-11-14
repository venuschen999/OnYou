import { describe, expect, it } from "vitest";
import { FeedingState } from "@/lib/domain/rewards";
import {
  feedingStateLabel,
  petResultAlt,
  sessionResultMessage,
  type SessionResultCopy,
} from "@/lib/domain/sessionResult";
import { minutesUntilNextApple } from "@/lib/domain/rewards";

const STARVING_COPY: SessionResultCopy = {
  petName: "Mochi",
  feedingState: FeedingState.STARVING,
  applesEarned: 0,
  durationMinutes: 15,
  feedingMinutesEarned: 15,
  minutesUntilNextApple: 10,
};

describe("minutes until the next apple (PRD v2.9 §6)", () => {
  it("is 25 when the feeding day has not started", () => {
    expect(minutesUntilNextApple(0, 0)).toBe(25);
  });

  it("is the remainder of the 25-minute apple for a partial day", () => {
    expect(minutesUntilNextApple(15, 0)).toBe(10);
    expect(minutesUntilNextApple(40, 1)).toBe(10);
  });

  it("starts the next apple after an exact 25-minute boundary", () => {
    expect(minutesUntilNextApple(25, 1)).toBe(25);
  });

  it("is zero once the pet is Full", () => {
    expect(minutesUntilNextApple(50, 2)).toBe(0);
  });
});

describe("session result copy (US6, #16)", () => {
  it("says how many minutes remain when no apple was earned yet", () => {
    expect(sessionResultMessage(STARVING_COPY)).toBe(
      "10 more minutes of focus today earns Mochi’s first apple.",
    );
  });

  it("uses the singular minute when one minute remains", () => {
    expect(
      sessionResultMessage({ ...STARVING_COPY, minutesUntilNextApple: 1 }),
    ).toBe("1 more minute of focus today earns Mochi’s first apple.");
  });

  it("says the pet was already Full and this session earns coins only", () => {
    expect(
      sessionResultMessage({
        petName: "Mochi",
        feedingState: FeedingState.FULL,
        applesEarned: 0,
        durationMinutes: 50,
        feedingMinutesEarned: 0,
        minutesUntilNextApple: 0,
      }),
    ).toBe(
      "Mochi was already full today, so this session earns coins only. Apples start again at midnight.",
    );
  });

  it("names minutes discarded by the 50-minute daily cap", () => {
    expect(
      sessionResultMessage({
        petName: "Mochi",
        feedingState: FeedingState.FULL,
        applesEarned: 1,
        durationMinutes: 25,
        feedingMinutesEarned: 15,
        minutesUntilNextApple: 0,
      }),
    ).toBe(
      "Mochi is full for today. 10 minutes went past the 50-minute daily limit, so they don’t count toward apples.",
    );
  });

  it("uses the singular minute when one minute is discarded", () => {
    expect(
      sessionResultMessage({
        petName: "Mochi",
        feedingState: FeedingState.FULL,
        applesEarned: 1,
        durationMinutes: 15,
        feedingMinutesEarned: 14,
        minutesUntilNextApple: 0,
      }),
    ).toBe(
      "Mochi is full for today. 1 minute went past the 50-minute daily limit, so they don’t count toward apples.",
    );
  });

  it("uses the pet name from the server snapshot", () => {
    expect(sessionResultMessage({ ...STARVING_COPY, petName: "Nori" })).toBe(
      "10 more minutes of focus today earns Nori’s first apple.",
    );
  });

  it("adds no extra sentence when an apple was earned and the cap was not hit", () => {
    expect(
      sessionResultMessage({
        petName: "Mochi",
        feedingState: FeedingState.HUNGRY,
        applesEarned: 1,
        durationMinutes: 25,
        feedingMinutesEarned: 25,
        minutesUntilNextApple: 25,
      }),
    ).toBeNull();
  });

  it("adds no extra sentence when the day becomes Full without discarded minutes", () => {
    expect(
      sessionResultMessage({
        petName: "Mochi",
        feedingState: FeedingState.FULL,
        applesEarned: 1,
        durationMinutes: 25,
        feedingMinutesEarned: 25,
        minutesUntilNextApple: 0,
      }),
    ).toBeNull();
  });
});

describe("feeding state labels (AGENTS.md §4)", () => {
  it("renders Starving, Hungry, and Full", () => {
    expect(feedingStateLabel(FeedingState.STARVING)).toBe("Starving");
    expect(feedingStateLabel(FeedingState.HUNGRY)).toBe("Hungry");
    expect(feedingStateLabel(FeedingState.FULL)).toBe("Full");
  });

  it("describes the pet with the mockup alt text", () => {
    expect(petResultAlt("Mochi", FeedingState.STARVING)).toBe(
      "Mochi is starving",
    );
    expect(petResultAlt("Mochi", FeedingState.HUNGRY)).toBe("Mochi is hungry");
    expect(petResultAlt("Mochi", FeedingState.FULL)).toBe("Mochi is full");
  });
});
