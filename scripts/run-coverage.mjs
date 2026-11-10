import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { evaluateCoverage, listDomainRuntimeSources } from "./coverageGate.mjs";

const rootDir = process.cwd();

function runVitest() {
  return spawnSync(
    process.execPath,
    [
      path.join(rootDir, "node_modules/vitest/vitest.mjs"),
      "run",
      "--config",
      "vitest.config.ts",
      "--coverage",
    ],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: { ...process.env, COVERAGE_ALLOW_EMPTY_SUITE: "1" },
    },
  );
}

function readCoverageSummary() {
  const summaryPath = path.join(rootDir, "coverage", "coverage-summary.json");
  if (!existsSync(summaryPath)) {
    return null;
  }
  return JSON.parse(readFileSync(summaryPath, "utf8"));
}

const vitest = runVitest();
if (vitest.error) {
  console.error(vitest.error.message);
}

const result = evaluateCoverage({
  domainSources: listDomainRuntimeSources(rootDir),
  summary: vitest.error ? null : readCoverageSummary(),
});

for (const line of result.report) {
  console.log(line);
}
for (const failure of result.failures) {
  console.error(failure);
}

process.exit(vitest.error || vitest.status !== 0 || !result.ok ? 1 : 0);
