import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DOCUMENT_PATH = path.join(process.cwd(), "docs", "openapi.yaml");

const PLANNED_PATHS = [
  "/api/auth/signup",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/password-reset/request",
  "/api/auth/password-reset/confirm",
  "/api/pet",
  "/api/sessions",
  "/api/sessions/active",
  "/api/sessions/{id}/heartbeat",
  "/api/sessions/{id}/complete",
  "/api/sessions/{id}/abandon",
] as const;

function loadOpenApiDocument(): string {
  return readFileSync(DOCUMENT_PATH, "utf8");
}

describe("OpenAPI document", () => {
  it("loads docs/openapi.yaml", () => {
    const document = loadOpenApiDocument();

    expect(document.length).toBeGreaterThan(0);
    expect(document).toMatch(/^openapi:\s*3\.1\.0\s*$/m);
    expect(document).toMatch(/^paths:\s*$/m);
  });

  it("declares OpenAPI version 3.1.0", () => {
    expect(loadOpenApiDocument()).toMatch(/^openapi:\s*3\.1\.0\s*$/m);
  });

  it("contains POST /api/sessions/{id}/heartbeat", () => {
    expect(loadOpenApiDocument()).toMatch(
      /^ {2}\/api\/sessions\/\{id\}\/heartbeat:\n {4}post:/m,
    );
  });

  it("lists the planned auth, pet, and session endpoints", () => {
    const document = loadOpenApiDocument();

    for (const plannedPath of PLANNED_PATHS) {
      expect(document).toContain(`\n  ${plannedPath}:\n`);
    }
  });

  it("uses camelCase JSON names", () => {
    const document = loadOpenApiDocument();

    expect(document).toContain("nextCursor");
    // onyou_auth is the HttpOnly cookie name from the account API, not a JSON field.
    const withoutCookieName = document.replaceAll("onyou_auth", "");
    expect(withoutCookieName).not.toMatch(/\b[a-z]+_[a-z0-9]+\b/);
  });

  it("does not document X-Session-Token", () => {
    const document = loadOpenApiDocument();

    expect(document).not.toContain("X-Session-Token");
    expect(document).not.toContain("sessionStorage");
    expect(document).not.toContain("SessionElsewhereNotice");
  });

  it("documents POST /api/sessions with ACTIVE_SESSION_EXISTS (#12)", () => {
    const document = loadOpenApiDocument();

    expect(document).toMatch(/^ {2}\/api\/sessions:\n(?: {4}.+\n)* {4}post:/m);
    expect(document).toContain("ACTIVE_SESSION_EXISTS");
    expect(document).toContain("One session at a time");
    expect(document).toContain("lastHeartbeatAt");
    expect(document).not.toContain("completionToken");
    expect(document).not.toContain("tokenHash");
  });

  it("documents POST /api/sessions/{id}/heartbeat as the stored session state (#14)", () => {
    const document = loadOpenApiDocument();
    const start = document.indexOf("  /api/sessions/{id}/heartbeat:");
    const end = document.indexOf("  /api/sessions/{id}/complete:");
    const heartbeat = document.slice(start, end);

    expect(heartbeat).toContain("operationId: heartbeatSession");
    expect(heartbeat).toContain("authCookie");
    expect(heartbeat).toContain('$ref: "#/components/schemas/FocusSession"');
    expect(heartbeat).toContain("SESSION_NOT_FOUND");
    expect(heartbeat).toContain("FORBIDDEN");
    expect(heartbeat).toContain("authoritative session state");
    expect(heartbeat).not.toMatch(/"409"/);
    expect(heartbeat).not.toContain("X-Session-Token");
  });

  it("documents GET /api/sessions/active as the session or null (#13)", () => {
    const document = loadOpenApiDocument();
    const start = document.indexOf("  /api/sessions/active:");
    const end = document.indexOf("  /api/sessions/{id}/heartbeat:");
    const activeRoute = document.slice(start, end);

    expect(activeRoute).toContain("operationId: getActiveSession");
    expect(activeRoute).toContain("authCookie");
    expect(activeRoute).toContain('$ref: "#/components/schemas/FocusSession"');
    expect(activeRoute).toContain('type: "null"');
  });
});
