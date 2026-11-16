import { readdirSync, readFileSync, statSync } from "node:fs";
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

  it("documents POST /api/sessions/{id}/complete as exactly-once rewards (#15)", () => {
    const document = loadOpenApiDocument();
    const start = document.indexOf("  /api/sessions/{id}/complete:");
    const end = document.indexOf("  /api/sessions/{id}/abandon:");
    const complete = document.slice(start, end);
    const errorCodes = document.slice(document.indexOf("ErrorResponse:"));

    expect(complete).toContain("operationId: completeSession");
    expect(complete).toContain("authCookie");
    expect(complete).toContain('$ref: "#/components/schemas/FocusSession"');
    expect(complete).toContain("SESSION_TOO_EARLY");
    expect(complete).toContain("SESSION_ABANDONED");
    expect(complete).toContain("SESSION_NOT_FOUND");
    expect(complete).toContain("FORBIDDEN");
    expect(complete).toContain("stored rewards");
    expect(complete).toContain("presence deadline");
    expect(complete).toContain("SessionPet");
    expect(complete).toContain("feedingState");
    expect(complete).toContain("minutesUntilNextApple");
    expect(complete).not.toContain("X-Session-Token");
    expect(complete).not.toContain("sessionStorage");
    expect(errorCodes).toContain("SESSION_TOO_EARLY");
    expect(errorCodes).toContain("SESSION_ABANDONED");
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

  it("marks the routes registered on main as shipped", () => {
    const document = loadOpenApiDocument();

    for (const [apiPath, method] of SHIPPED_OPERATIONS) {
      expect(operationBlock(document, apiPath, method)).toContain(
        "x-implementation: shipped",
      );
    }
    expect(document.match(/x-implementation: shipped/g)).toHaveLength(
      SHIPPED_OPERATIONS.length,
    );
    expect(implementedProductRoutes()).toEqual(
      SHIPPED_OPERATIONS.map(
        ([apiPath, method]) => `${method} ${apiPath}`,
      ).sort(),
    );
  });

  it("marks unfinished MVP paths as not implemented", () => {
    const document = loadOpenApiDocument();

    for (const [apiPath, method, issue] of PLANNED_OPERATIONS) {
      const block = operationBlock(document, apiPath, method);
      expect(block).toContain("x-implementation: planned");
      expect(block).toContain("Not implemented");
      expect(block).toContain(issue);
      expect(block).not.toMatch(/"200":/);
      expect(block).not.toMatch(/"201":/);
    }
    const pet = pathBlock(document, "/api/pet");
    expect(pet).toContain("issue #19");
    expect(pet).not.toContain('$ref: "#/components/schemas/');
  });

  it("documents session validation, auth errors, and server errors", () => {
    const document = loadOpenApiDocument();
    const start = operationBlock(document, "/api/sessions", "post");

    expect(start).toContain("Choose 15, 25, or 50 minutes.");
    expect(start).toContain("VALIDATION_ERROR");
    expect(start).toContain('$ref: "#/components/responses/InternalError"');
    for (const [apiPath, method] of [
      ["/api/sessions/active", "get"],
      ["/api/sessions/{id}/heartbeat", "post"],
      ["/api/sessions/{id}/complete", "post"],
    ] as const) {
      expect(operationBlock(document, apiPath, method)).toContain(
        '$ref: "#/components/responses/InternalError"',
      );
    }
    expect(document).toContain("code: UNAUTHENTICATED");
    expect(document).toContain("Log in to continue.");
    expect(document).toContain("code: INTERNAL_ERROR");
    expect(document).toContain("Something went wrong. Try again.");
  });

  it("documents completion rewards from the feeding rules", () => {
    const complete = operationBlock(
      loadOpenApiDocument(),
      "/api/sessions/{id}/complete",
      "post",
    );

    expect(complete).toContain("earns its duration in coins");
    expect(complete).toContain("capped at 50");
    expect(complete).toContain("25 feeding minutes");
    expect(complete).toContain("at most 2");
  });

  it("leaves history item fields for unmerged pull request #56", () => {
    const document = loadOpenApiDocument();
    const history = operationBlock(document, "/api/sessions", "get");
    const page = document.slice(document.indexOf("    SessionHistoryPage:"));

    expect(document).toContain("Pull request #56");
    expect(document).toContain("issue #22");
    expect(page).toContain("later revision");
    expect(history).not.toContain("x-implementation: shipped");
    expect(document).not.toContain("HistorySession");
  });

  it("resolves internal references and hides secrets and completion tokens", () => {
    const document = loadOpenApiDocument();
    const refs = [...document.matchAll(/\$ref: "(#\/components\/[^"]+)"/g)];

    expect(refs.length).toBeGreaterThan(0);
    for (const [, ref] of refs) {
      const name = ref.slice(ref.lastIndexOf("/") + 1);
      expect(document).toContain(`\n    ${name}:\n`);
    }
    const operationIds = [
      ...document.matchAll(/^ {6}operationId: (\w+)$/gm),
    ].map((match) => match[1]);
    expect(new Set(operationIds).size).toBe(operationIds.length);
    expect(document).not.toContain("X-Session-Token");
    expect(document).not.toContain("sessionStorage");
    expect(document).not.toContain("SessionElsewhereNotice");
    expect(document).not.toContain("JWT_SECRET");
    expect(document).not.toContain("passwordHash");
    expect(document).not.toContain("DATABASE_URL");
  });
});

const SHIPPED_OPERATIONS = [
  ["/api/auth/signup", "post"],
  ["/api/auth/login", "post"],
  ["/api/sessions", "post"],
  ["/api/sessions/active", "get"],
  ["/api/sessions/{id}/heartbeat", "post"],
  ["/api/sessions/{id}/complete", "post"],
] as const;

const PLANNED_OPERATIONS = [
  ["/api/auth/logout", "post", "#18"],
  ["/api/auth/password-reset/request", "post", "#24"],
  ["/api/auth/password-reset/confirm", "post", "#25"],
  ["/api/pet", "get", "#19"],
  ["/api/pet", "patch", "#10"],
  ["/api/sessions/{id}/abandon", "post", "#17"],
] as const;

function operationBlock(
  document: string,
  apiPath: string,
  method: string,
): string {
  const pathSource = pathBlock(document, apiPath);
  const methodHeader = `\n    ${method}:\n`;
  const start = pathSource.indexOf(methodHeader);
  if (start < 0) {
    throw new Error(`Missing ${method.toUpperCase()} ${apiPath}`);
  }
  const after = pathSource.slice(start + 1);
  const nextMethod = after.search(/\n    (?:get|post|patch|put|delete):\n/);
  return nextMethod < 0 ? after : after.slice(0, nextMethod + 1);
}

function pathBlock(document: string, apiPath: string): string {
  const header = `\n  ${apiPath}:\n`;
  const start = document.indexOf(header);
  if (start < 0) throw new Error(`Missing path ${apiPath}`);
  const after = document.slice(start + 1);
  const nextPath = after.search(/\n  \//);
  return nextPath < 0 ? after : after.slice(0, nextPath + 1);
}

function implementedProductRoutes(): string[] {
  const apiRoot = path.join(process.cwd(), "src", "app", "api");
  const routes: string[] = [];
  for (const file of walk(apiRoot)) {
    if (!file.endsWith(`${path.sep}route.ts`)) continue;
    if (file.endsWith(`${path.sep}openapi${path.sep}route.ts`)) continue;
    const relative = path.relative(apiRoot, path.dirname(file));
    const apiPath = `/${path.posix.join(
      "api",
      ...relative
        .split(path.sep)
        .map((segment) =>
          segment.startsWith("[") && segment.endsWith("]")
            ? `{${segment.slice(1, -1)}}`
            : segment,
        ),
    )}`;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(
      /export async function (GET|POST|PATCH|PUT|DELETE)/g,
    )) {
      routes.push(`${match[1].toLowerCase()} ${apiPath}`);
    }
  }
  return routes.sort();
}

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) files.push(...walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}
