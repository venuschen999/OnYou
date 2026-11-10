import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateCoverage,
  listDomainRuntimeSources,
} from "../../scripts/coverageGate.mjs";

type CoverageCounts = {
  total: number;
  covered: number;
};

type FileCoverage = {
  lines?: CoverageCounts;
  branches?: CoverageCounts;
};

type CoverageSummary = Record<string, FileCoverage | undefined>;

const REWARDS = "src/lib/domain/rewards.ts";

function overallSummary(
  covered: number,
  total: number,
  files: CoverageSummary = {},
): CoverageSummary {
  return {
    total: { lines: { covered, total } },
    ...files,
  };
}

function domainFile(
  linesCovered: number,
  linesTotal: number,
  branchesCovered: number,
  branchesTotal: number,
): FileCoverage {
  return {
    lines: { covered: linesCovered, total: linesTotal },
    branches: { covered: branchesCovered, total: branchesTotal },
  };
}

function domainSummary(
  linesCovered: number,
  linesTotal: number,
  branchesCovered: number,
  branchesTotal: number,
  overallCovered = 90,
): CoverageSummary {
  return overallSummary(overallCovered, 100, {
    [`/repo/${REWARDS}`]: domainFile(
      linesCovered,
      linesTotal,
      branchesCovered,
      branchesTotal,
    ),
  });
}

function reportText(summary: CoverageSummary | null, sources: readonly string[]) {
  return evaluateCoverage({ domainSources: sources, summary }).report.join("\n");
}

describe("domain coverage gate (AGENTS.md §6)", () => {
  it("reports N/A when no runtime domain source exists", () => {
    const result = evaluateCoverage({
      domainSources: [],
      summary: overallSummary(100, 100),
    });

    expect(result.ok).toBe(true);
    expect(result.domainStatus).toBe("na");
    expect(result.report.join("\n")).toContain("Domain coverage: N/A");
    expect(result.report.join("\n")).not.toMatch(/Domain coverage:[^\n]*100%/);
    expect(result.report.join("\n")).toContain("95% line");
  });

  it("ignores declaration files when deciding that domain coverage is N/A", () => {
    const root = mkdtempSync(path.join(tmpdir(), "onyou-coverage-"));
    try {
      const domain = path.join(root, "src", "lib", "domain");
      mkdirSync(domain, { recursive: true });
      writeFileSync(path.join(domain, "types.d.ts"), "export type Id = string;\n");
      writeFileSync(path.join(domain, "rewards.test.ts"), "export {};\n");
      writeFileSync(path.join(domain, ".gitkeep"), "");

      const sources = listDomainRuntimeSources(root);
      const result = evaluateCoverage({
        domainSources: sources,
        summary: overallSummary(90, 100),
      });

      expect(sources).toEqual([]);
      expect(result.ok).toBe(true);
      expect(result.domainStatus).toBe("na");
      expect(reportText(overallSummary(90, 100), sources)).toContain(
        "Domain coverage: N/A",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("passes when domain lines and branches are at least 95%", () => {
    const result = evaluateCoverage({
      domainSources: [REWARDS],
      summary: domainSummary(95, 100, 19, 20),
    });

    expect(result.ok).toBe(true);
    expect(result.domainStatus).toBe("measured");
    expect(result.failures).toEqual([]);
    expect(result.report.join("\n")).toContain("lines 95.00%");
    expect(result.report.join("\n")).toContain("branches 95.00%");
  });

  it("fails when domain line coverage is below 95%", () => {
    const result = evaluateCoverage({
      domainSources: [REWARDS],
      summary: domainSummary(94, 100, 20, 20),
    });

    expect(result.ok).toBe(false);
    expect(result.domainStatus).toBe("measured");
    expect(result.failures).toEqual([
      "Domain line coverage is 94.00% and does not meet 95%.",
    ]);
  });

  it("fails when domain branch coverage is below 95%", () => {
    const result = evaluateCoverage({
      domainSources: [REWARDS],
      summary: domainSummary(100, 100, 18, 20),
    });

    expect(result.ok).toBe(false);
    expect(result.domainStatus).toBe("measured");
    expect(result.failures).toEqual([
      "Domain branch coverage is 90.00% and does not meet 95%.",
    ]);
  });

  it("fails when domain source is missing from coverage data", () => {
    const present = evaluateCoverage({
      domainSources: [REWARDS],
      summary: overallSummary(100, 100),
    });
    const absent = evaluateCoverage({
      domainSources: [REWARDS],
      summary: null,
    });

    expect(present.ok).toBe(false);
    expect(present.domainStatus).toBe("missing");
    expect(present.failures).toEqual([
      `Domain source exists but is missing from coverage data: ${REWARDS}.`,
    ]);
    expect(absent.ok).toBe(false);
    expect(absent.domainStatus).toBe("missing");
    expect(absent.failures).toContain(
      `Domain source exists but is missing from coverage data: ${REWARDS}.`,
    );
  });

  it("fails when overall line coverage is below 80%", () => {
    const result = evaluateCoverage({
      domainSources: [],
      summary: overallSummary(79, 100),
    });

    expect(result.ok).toBe(false);
    expect(result.domainStatus).toBe("na");
    expect(result.failures).toEqual([
      "Overall line coverage is 79.00% and does not meet 80%.",
    ]);
  });

  it("fails overall coverage below 80% even when domain coverage passes", () => {
    const result = evaluateCoverage({
      domainSources: [REWARDS],
      summary: domainSummary(100, 100, 20, 20, 79),
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      "Overall line coverage is 79.00% and does not meet 80%.",
    );
  });
});
