import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE_PATH = path.join(
  process.cwd(),
  "src/app/api/sessions/[id]/heartbeat/route.ts",
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

describe("heartbeat outcome inputs (PRD v2.9 §5.2, #14)", () => {
  it("reuses presence resolution and does not decide the outcome from a tab token or unload hook", () => {
    const route = readFileSync(ROUTE_PATH, "utf8");
    const service = readFileSync(SERVICE_PATH, "utf8");
    const source = `${route}\n${service}`;
    const heartbeat = exportedFunction(service, "heartbeatSession");

    for (const banned of BANNED_OUTCOME_MECHANISMS) {
      expect(source).not.toContain(banned);
    }
    expect(service).toContain("planSessionResolution");
    expect(heartbeat).not.toMatch(/status:\s*"COMPLETED"/);
    expect(service).not.toContain("PRESENCE_GRACE_SECONDS =");
  });
});
