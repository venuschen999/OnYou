import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// AGENTS.md §6. These stay aligned with the Vitest thresholds.
export const OVERALL_LINE_COVERAGE_MINIMUM = 80;
export const DOMAIN_LINE_COVERAGE_MINIMUM = 95;
export const DOMAIN_BRANCH_COVERAGE_MINIMUM = 95;

const RUNTIME_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[^.]+$/;

export function isDomainRuntimeSource(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (base.endsWith(".d.ts") || TEST_FILE_PATTERN.test(base)) {
    return false;
  }
  return RUNTIME_EXTENSIONS.has(path.posix.extname(base));
}

export function listDomainRuntimeSources(rootDir) {
  const domainDir = path.join(rootDir, "src", "lib", "domain");
  if (!existsSync(domainDir)) {
    return [];
  }
  const sources = [];
  collectRuntimeSources(domainDir, rootDir, sources);
  sources.sort();
  return sources;
}

function collectRuntimeSources(directory, rootDir, sources) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectRuntimeSources(fullPath, rootDir, sources);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const relativePath = path.relative(rootDir, fullPath).split(path.sep).join("/");
    if (isDomainRuntimeSource(relativePath)) {
      sources.push(relativePath);
    }
  }
}

function percentageText(covered, total) {
  if (total === 0) {
    return "100.00";
  }
  return ((covered / total) * 100).toFixed(2);
}

function meets(covered, total, minimum) {
  if (total === 0) {
    return true;
  }
  return covered * 100 >= total * minimum;
}

function hasCounts(entry, field) {
  const counts = entry?.[field];
  return (
    !!counts && Number.isFinite(counts.total) && Number.isFinite(counts.covered)
  );
}

function findSummaryEntry(summary, source) {
  const suffix = `/${source}`;
  for (const key of Object.keys(summary)) {
    if (key === "total") {
      continue;
    }
    const normalized = key.replaceAll("\\", "/");
    if (normalized === source || normalized.endsWith(suffix)) {
      return summary[key];
    }
  }
  return undefined;
}

function sumCounts(entries, field) {
  let covered = 0;
  let total = 0;
  for (const entry of entries) {
    covered += entry[field].covered;
    total += entry[field].total;
  }
  return { covered, total };
}

function evaluateOverall(summary, failures, report) {
  const lines = summary?.total?.lines;
  if (!lines || !Number.isFinite(lines.total) || !Number.isFinite(lines.covered)) {
    failures.push(
      "Coverage summary was not written, so overall coverage was not measured.",
    );
    return;
  }
  const text = percentageText(lines.covered, lines.total);
  report.push(
    `Overall line coverage: ${text}% (minimum ${OVERALL_LINE_COVERAGE_MINIMUM}%).`,
  );
  if (!meets(lines.covered, lines.total, OVERALL_LINE_COVERAGE_MINIMUM)) {
    failures.push(
      `Overall line coverage is ${text}% and does not meet ${OVERALL_LINE_COVERAGE_MINIMUM}%.`,
    );
  }
}

function domainRequirementText() {
  return `The ${DOMAIN_LINE_COVERAGE_MINIMUM}% line and ${DOMAIN_BRANCH_COVERAGE_MINIMUM}% branch requirement applies when runtime source exists.`;
}

function evaluateDomain(domainSources, summary, failures, report) {
  if (domainSources.length === 0) {
    report.push(
      `Domain coverage: N/A (no runtime source files under src/lib/domain/). ${domainRequirementText()}`,
    );
    return "na";
  }
  if (!summary) {
    failures.push(missingCoverageMessage(domainSources));
    return "missing";
  }

  const measured = [];
  const missing = [];
  for (const source of domainSources) {
    const entry = findSummaryEntry(summary, source);
    if (!hasCounts(entry, "lines") || !hasCounts(entry, "branches")) {
      missing.push(source);
      continue;
    }
    measured.push(entry);
  }
  if (missing.length > 0) {
    failures.push(missingCoverageMessage(missing));
    return "missing";
  }

  appendMeasuredDomain(measured, failures, report);
  return "measured";
}

function missingCoverageMessage(sources) {
  return `Domain source exists but is missing from coverage data: ${sources.join(", ")}.`;
}

function appendMeasuredDomain(entries, failures, report) {
  const lines = sumCounts(entries, "lines");
  const branches = sumCounts(entries, "branches");
  const lineText = percentageText(lines.covered, lines.total);
  const branchText = percentageText(branches.covered, branches.total);
  report.push(
    `Domain coverage: lines ${lineText}%, branches ${branchText}% (minimum ${DOMAIN_LINE_COVERAGE_MINIMUM}% lines, ${DOMAIN_BRANCH_COVERAGE_MINIMUM}% branches).`,
  );
  if (!meets(lines.covered, lines.total, DOMAIN_LINE_COVERAGE_MINIMUM)) {
    failures.push(
      `Domain line coverage is ${lineText}% and does not meet ${DOMAIN_LINE_COVERAGE_MINIMUM}%.`,
    );
  }
  if (!meets(branches.covered, branches.total, DOMAIN_BRANCH_COVERAGE_MINIMUM)) {
    failures.push(
      `Domain branch coverage is ${branchText}% and does not meet ${DOMAIN_BRANCH_COVERAGE_MINIMUM}%.`,
    );
  }
}

export function evaluateCoverage({ domainSources, summary }) {
  const failures = [];
  const report = [];
  evaluateOverall(summary, failures, report);
  const domainStatus = evaluateDomain(domainSources, summary, failures, report);
  return {
    ok: failures.length === 0,
    domainStatus,
    failures,
    report,
  };
}
