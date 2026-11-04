import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

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

function measuredDomainFiles(summary) {
  const marker = `${path.sep}src${path.sep}lib${path.sep}domain${path.sep}`;
  return Object.keys(summary).filter((file) => file.includes(marker));
}

const vitest = runVitest();
if (vitest.error) {
  console.error(vitest.error.message);
  process.exit(1);
}

const summaryPath = path.join(rootDir, "coverage", "coverage-summary.json");
let domainUnmeasured = false;
if (!existsSync(summaryPath)) {
  console.error(
    "Coverage summary was not written, so domain coverage was not measured.",
  );
  domainUnmeasured = true;
} else {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  if (measuredDomainFiles(summary).length === 0) {
    console.error(
      "No source files under src/lib/domain/ were included in coverage. The 95% domain line and branch gate is not satisfied.",
    );
    domainUnmeasured = true;
  }
}

process.exit(vitest.status !== 0 || domainUnmeasured ? 1 : 0);
