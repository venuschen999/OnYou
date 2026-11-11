import { describe, expect, it } from "vitest";
import { migrationDatabaseUrl } from "@/lib/server/migrationDatabaseUrl";

describe("migrationDatabaseUrl", () => {
  it("uses the direct Neon URL when preview or production sets one", () => {
    expect(
      migrationDatabaseUrl({
        DATABASE_URL: "postgresql://pooled.example/onyou",
        DATABASE_URL_UNPOOLED: "postgresql://direct.example/onyou",
      }),
    ).toBe("postgresql://direct.example/onyou");
  });

  it("uses DATABASE_URL when the database is already a direct connection", () => {
    expect(
      migrationDatabaseUrl({
        DATABASE_URL: "postgresql://127.0.0.1:54329/onyou_test",
      }),
    ).toBe("postgresql://127.0.0.1:54329/onyou_test");
  });

  it("ignores a blank direct URL", () => {
    expect(
      migrationDatabaseUrl({
        DATABASE_URL: "postgresql://127.0.0.1:54329/onyou_test",
        DATABASE_URL_UNPOOLED: "   ",
      }),
    ).toBe("postgresql://127.0.0.1:54329/onyou_test");
  });

  it("returns undefined when neither migration URL is set", () => {
    expect(migrationDatabaseUrl({})).toBeUndefined();
  });
});
