import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE_PATH = path.join(
  process.cwd(),
  "src/app/api/sessions/[id]/complete/route.ts",
);
const SERVICE_PATH = path.join(
  process.cwd(),
  "src/lib/server/sessionService.ts",
);

const BANNED_OUTCOME_MECHANISMS = [
  "sessionStorage",
  "X-Session-Token",
  "SessionElsewhereNotice",
  "beforeunload",
  "pagehide",
  "localStorage",
];

function exportedFunction(source: string, name: string): string {
  const marker = `export async function ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const next = source.indexOf("\nexport ", start + marker.length);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("completion outcome inputs (PRD v2.9 §5.3, #15)", () => {
  it("completes from stored timestamps and the reward functions, without a tab token", () => {
    const route = readFileSync(ROUTE_PATH, "utf8");
    const service = readFileSync(SERVICE_PATH, "utf8");
    const complete = exportedFunction(service, "completeSession");
    const source = `${route}\n${service}`;

    for (const banned of BANNED_OUTCOME_MECHANISMS) {
      expect(source).not.toContain(banned);
    }
    expect(route).not.toContain("readJsonBody");
    expect(route).not.toContain("request.json");
    expect(complete.length).toBeGreaterThan(0);
    expect(service).toContain("calculateRewards");
    expect(service).toContain("getFeedingDay");
    expect(service).toContain('status: "COMPLETED"');
    expect(service).toContain("FOR UPDATE");
    expect(service).not.toContain("APPLE_MINUTES =");
    expect(service).not.toMatch(/Math\.floor/);
  });
});
