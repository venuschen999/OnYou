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
      // Vitest 5 dropped `coverage.all`. Files matched by `include` are still
      // reported when no test imports them, so the 80% line gate stays honest.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        // Ambient declarations match src/**/*.ts but have no runtime lines.
        "**/*.d.ts",
      ],
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
      // AGENTS.md §6. Thresholds are unchanged. With no runtime files under
      // src/lib/domain/, Istanbul can treat this glob as 100%. The coverage
      // script reports that case as N/A and still enforces 95% once source exists.
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
