import { describe, expect, it } from "vitest";
import {
  DEFAULT_PET_NAME,
  PET_NAME_MAX_LENGTH,
  petNameSchema,
} from "@/lib/validation/pet";

// PRD v2.9 §7; docs/agent-memory/pet.md P5.
describe("petNameSchema", () => {
  it("defaults to Mochi and allows 30 characters", () => {
    expect(DEFAULT_PET_NAME).toBe("Mochi");
    expect(PET_NAME_MAX_LENGTH).toBe(30);
  });

  it("trims spaces around the name", () => {
    expect(petNameSchema.parse("  Biscuit  ")).toBe("Biscuit");
  });

  it.each(["", "   "])("restores Mochi for a blank name %j", (value) => {
    expect(petNameSchema.parse(value)).toBe("Mochi");
  });

  it("accepts exactly 30 characters", () => {
    const name = "a".repeat(30);
    expect(petNameSchema.parse(name)).toBe(name);
  });

  it("rejects 31 characters with the mockup message and never truncates", () => {
    const result = petNameSchema.safeParse("a".repeat(31));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Pet names can be up to 30 characters. This one has 31.",
    );
  });

  it("counts an emoji as one character", () => {
    const name = `${"a".repeat(29)}\u{1F34E}`;
    expect(petNameSchema.parse(name)).toBe(name);
  });

  it("measures the length after trimming", () => {
    expect(petNameSchema.parse(`  ${"b".repeat(30)}  `)).toBe("b".repeat(30));
  });
});
