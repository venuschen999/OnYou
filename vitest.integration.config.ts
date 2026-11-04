import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Real PostgreSQL via TEST_DATABASE_URL (AGENTS.md §6). Applying Prisma
// migrations is Issue #5; this config only runs the integration suite.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    name: "integration",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/requireTestDatabaseUrl.ts"],
    // Files share one database, so they must not run concurrently.
    fileParallelism: false,
    environment: "node",
    passWithNoTests: false,
  },
});
