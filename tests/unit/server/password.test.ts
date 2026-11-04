import { describe, expect, it } from "vitest";
import {
  BCRYPT_COST,
  hashPassword,
  verifyPassword,
} from "@/lib/server/password";

const MIN_BCRYPT_COST = 10;

describe("password hashing (AGENTS.md §12)", () => {
  it("uses a bcrypt cost of at least 10", () => {
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(MIN_BCRYPT_COST);
  });

  it("produces a bcrypt hash at the configured cost, not the plain password", async () => {
    const hash = await hashPassword("sunflower22");
    expect(hash).not.toContain("sunflower22");
    expect(hash.startsWith(`$2b$${BCRYPT_COST}$`)).toBe(true);
  });

  it("verifies the original password", async () => {
    const hash = await hashPassword("sunflower22");
    await expect(verifyPassword("sunflower22", hash)).resolves.toBe(true);
  });

  it("rejects a different password", async () => {
    const hash = await hashPassword("sunflower22");
    await expect(verifyPassword("sunflower23", hash)).resolves.toBe(false);
  });
});
