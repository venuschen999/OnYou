import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const viewerPath = path.join(process.cwd(), "src/app/docs/SwaggerViewer.tsx");
const pagePath = path.join(process.cwd(), "src/app/docs/page.tsx");

describe("Swagger UI page", () => {
  it("is configured to load the specification from /api/openapi", () => {
    const viewer = readFileSync(viewerPath, "utf8");
    const page = readFileSync(pagePath, "utf8");

    expect(page).toContain("SwaggerViewer");
    expect(viewer).toContain('"use client"');
    expect(viewer).toContain('export const OPENAPI_SPEC_URL = "/api/openapi"');
    expect(viewer).toContain("url: OPENAPI_SPEC_URL");
    expect(viewer).toContain('import("swagger-ui-bundle")');
  });
});
