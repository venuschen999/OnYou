import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prettier owns formatting; turn off ESLint rules that conflict with it.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // Historical HW3 evidence snapshots, not application code (AGENTS.md §0).
    "docs/**",
    // Nested git worktree for another branch. It is not part of this app.
    "OnYou-issue7/**",
  ]),
]);

export default eslintConfig;
