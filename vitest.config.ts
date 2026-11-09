import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Unit tests and the coverage gate. Integration tests have their own config
// so they are not collected here and cannot run without TEST_DATABASE_URL.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    name: "unit",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    environment: "node",
    // npm test fails when the suite is empty. The coverage script sets this
    // so the report is still produced; thresholds decide whether that run passes.
    passWithNoTests: process.env.COVERAGE_ALLOW_EMPTY_SUITE === "1",
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      // AGENTS.md §6. Domain branches are checked on the glob below.
      // An empty src/lib/domain/ is not 95% covered; scripts/run-coverage.mjs
      // fails that case because Istanbul reports an empty summary as 100%.
      thresholds: {
        lines: 80,
        "src/lib/domain/**": {
          lines: 95,
          branches: 95,
        },
      },
    },
  },
});
