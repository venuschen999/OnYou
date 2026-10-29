import { describe, expect, it } from "vitest";
import {
  FeedingState,
  feedingStateForApples,
  feedingStateLabel,
} from "../../src/lib/domain/feedingState";

describe("feeding state", () => {
  it("maps 0 apples to Starving", () => {
    expect(feedingStateForApples(0)).toBe(FeedingState.STARVING);
    expect(feedingStateLabel(FeedingState.STARVING)).toBe("Starving");
  });

  it("maps 1 apple to Hungry", () => {
    expect(feedingStateForApples(1)).toBe(FeedingState.HUNGRY);
    expect(feedingStateLabel(FeedingState.HUNGRY)).toBe("Hungry");
  });

  it("maps 2 apples to Full", () => {
    expect(feedingStateForApples(2)).toBe(FeedingState.FULL);
    expect(feedingStateLabel(FeedingState.FULL)).toBe("Full");
  });
});
