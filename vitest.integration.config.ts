import path from "node:path";
import { defineConfig } from "vitest/config";

// Integration tests run against a real PostgreSQL database (AGENTS.md §6).
// globalSetup applies the committed Prisma migrations to TEST_DATABASE_URL only.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/globalSetup.ts"],
    // Files share one database, so they must not run concurrently.
    fileParallelism: false,
    environment: "node",
    passWithNoTests: false,
  },
});
