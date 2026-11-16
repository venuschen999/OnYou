import { describe, expect, it } from "vitest";
import { HISTORY_PAGE_SIZE } from "@/lib/domain/history";
import { historyQuerySchema } from "@/lib/validation/history";

const LIMIT_MESSAGE = "History pages contain 20 sessions.";

describe("historyQuerySchema (US8, #22)", () => {
  it("defaults the page size to 20 when limit is omitted", () => {
    const result = historyQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ limit: HISTORY_PAGE_SIZE });
    }
  });

  it("accepts an explicit page size of 20 and a cursor", () => {
    const result = historyQuerySchema.safeParse({
      cursor: " session_20 ",
      limit: "20",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ cursor: "session_20", limit: 20 });
    }
  });

  it("rejects a page size other than 20", () => {
    const result = historyQuerySchema.safeParse({ limit: "21" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(LIMIT_MESSAGE);
    }
  });

  it("rejects an empty cursor", () => {
    const result = historyQuerySchema.safeParse({ cursor: "  " });

    expect(result.success).toBe(false);
  });
});
