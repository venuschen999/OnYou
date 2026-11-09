import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "../../src/app/api/openapi/route";

describe("GET /api/openapi", () => {
  it("returns the current OpenAPI YAML", async () => {
    const expected = readFileSync(
      path.join(process.cwd(), "docs", "openapi.yaml"),
      "utf8",
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(
      /(?:application|text)\/(?:yaml|x-yaml)/i,
    );
    expect(await response.text()).toBe(expected);
  });
});
