import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPetProgress } from "@/lib/domain/petProgress";
import { FeedingState } from "@/lib/domain/rewards";

describe("buildPetProgress (US4, PRD v2.9 §6)", () => {
  it("shows a new day as Starving with nothing toward the next apple", () => {
    expect(
      buildPetProgress({
        name: "Mochi",
        coins: 0,
        feedingMinutes: 0,
        apples: 0,
      }),
    ).toEqual({
      name: "Mochi",
      coins: 0,
      applesToday: 0,
      feedingMinutesTowardNextApple: 0,
      feedingState: FeedingState.STARVING,
    });
  });

  it("counts minutes toward the first apple while still Starving", () => {
    const progress = buildPetProgress({
      name: "Mochi",
      coins: 15,
      feedingMinutes: 15,
      apples: 0,
    });

    expect(progress.feedingState).toBe(FeedingState.STARVING);
    expect(progress.feedingMinutesTowardNextApple).toBe(15);
  });

  it("carries leftover minutes after the first apple", () => {
    const progress = buildPetProgress({
      name: "Mochi",
      coins: 385,
      feedingMinutes: 35,
      apples: 1,
    });

    expect(progress).toMatchObject({
      applesToday: 1,
      feedingMinutesTowardNextApple: 10,
      feedingState: FeedingState.HUNGRY,
    });
  });

  it("has nothing toward another apple once Full", () => {
    const progress = buildPetProgress({
      name: "Mochi",
      coins: 460,
      feedingMinutes: 50,
      apples: 2,
    });

    expect(progress).toMatchObject({
      applesToday: 2,
      feedingMinutesTowardNextApple: 0,
      feedingState: FeedingState.FULL,
    });
  });

  it("passes coins through unchanged; they never reset", () => {
    expect(
      buildPetProgress({
        name: "Bean",
        coins: 1234,
        feedingMinutes: 0,
        apples: 0,
      }),
    ).toMatchObject({ name: "Bean", coins: 1234 });
  });

  it.each([
    [0, FeedingState.STARVING],
    [1, FeedingState.HUNGRY],
    [2, FeedingState.FULL],
  ])("maps %i apples to %s", (apples, state) => {
    expect(
      buildPetProgress({
        name: "Mochi",
        coins: 0,
        feedingMinutes: apples * 25,
        apples,
      }).feedingState,
    ).toBe(state);
  });

  it("does not read the clock or import outside the domain", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/domain/petProgress.ts"),
      "utf8",
    );
    expect(source).not.toContain("Date.now");
    expect(source).not.toMatch(/new Date\(\s*\)/);
    expect(source).not.toMatch(/from "(?!\.\/|@\/lib\/domain\/)/);
  });
});
