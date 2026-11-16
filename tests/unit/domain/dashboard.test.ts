import { describe, expect, it } from "vitest";
import {
  dashboardCopy,
  feedingProgressLabel,
  feedingProgressPercent,
  type PetProgress,
} from "@/lib/domain/dashboard";
import { hungryPet, starvingPet } from "../../fixtures/petProgress";

function pet(overrides: Partial<PetProgress>): PetProgress {
  return { ...starvingPet, ...overrides };
}

describe("dashboard copy (US4, #20)", () => {
  it("describes a pet that has not eaten today", () => {
    expect(dashboardCopy(starvingPet, null)).toEqual({
      title: "Mochi hasn’t eaten today.",
      subtitle:
        "Finish a session to feed it. Every 25 minutes of focus earns an apple.",
    });
    expect(feedingProgressLabel(starvingPet)).toBe(
      "0 of 25 min to the next apple",
    );
    expect(feedingProgressPercent(starvingPet)).toBe(0);
  });

  it("counts minutes already earned toward the first apple", () => {
    const partial = pet({
      name: "Nori",
      feedingMinutesTowardNextApple: 15,
    });

    expect(dashboardCopy(partial, null).title).toBe("Nori hasn’t eaten today.");
    expect(dashboardCopy(partial, null).subtitle).toBe(
      "10 more minutes of focus earns Nori’s first apple.",
    );
    expect(feedingProgressLabel(partial)).toBe(
      "15 of 25 min to the next apple",
    );
    expect(feedingProgressPercent(partial)).toBe(60);
  });

  it("uses the singular minute when one minute remains", () => {
    const almost = pet({ feedingMinutesTowardNextApple: 24 });

    expect(dashboardCopy(almost, null).subtitle).toBe(
      "1 more minute of focus earns Mochi’s first apple.",
    );
  });

  it("describes one apple earned and the minutes left for the second", () => {
    expect(dashboardCopy(hungryPet, null)).toEqual({
      title: "One apple down, one to go.",
      subtitle: "15 more minutes of focus earns the second apple.",
    });
    expect(feedingProgressLabel(hungryPet)).toBe(
      "10 of 25 min to the next apple",
    );
    expect(feedingProgressPercent(hungryPet)).toBe(40);
  });

  it("says the running session earns the second apple when it is long enough", () => {
    expect(dashboardCopy(hungryPet, { durationMinutes: 25 }).subtitle).toBe(
      "This session finishing earns the second apple.",
    );
    expect(dashboardCopy(hungryPet, { durationMinutes: 15 }).subtitle).toBe(
      "This session finishing earns the second apple.",
    );
  });

  it("keeps the remaining minutes when the running session is too short", () => {
    const justFed = pet({
      applesToday: 1,
      feedingState: "HUNGRY",
      feedingMinutesTowardNextApple: 0,
    });

    expect(dashboardCopy(justFed, { durationMinutes: 15 }).subtitle).toBe(
      "25 more minutes of focus earns the second apple.",
    );
  });

  it("says the pet is full for today at two apples", () => {
    const full = pet({
      name: "Nori",
      applesToday: 2,
      feedingState: "FULL",
      coins: 460,
    });

    expect(dashboardCopy(full, { durationMinutes: 50 })).toEqual({
      title: "Nori is full for today.",
      subtitle:
        "More sessions still earn coins. Apples start again at midnight.",
    });
    expect(feedingProgressLabel(full)).toBe("Full for today");
    expect(feedingProgressPercent(full)).toBe(100);
  });

  it("keeps a partial bar inside 0 to 25 minutes", () => {
    expect(
      feedingProgressPercent(pet({ feedingMinutesTowardNextApple: -4 })),
    ).toBe(0);
    expect(
      feedingProgressPercent(pet({ feedingMinutesTowardNextApple: 40 })),
    ).toBe(100);
    expect(
      feedingProgressLabel(pet({ feedingMinutesTowardNextApple: 40 })),
    ).toBe("25 of 25 min to the next apple");
  });
});
