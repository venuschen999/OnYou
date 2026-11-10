import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(): Promise<Response> {
  const document = await readOpenApiDocument();

  return new Response(document, {
    status: 200,
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
    },
  });
}

// Cache Components can prerender this GET handler only when the file read is
// cached. docs/openapi.yaml stays the source of the served document.
async function readOpenApiDocument(): Promise<string> {
  "use cache";

  const filePath = path.join(process.cwd(), "docs", "openapi.yaml");
  return readFile(filePath, "utf8");
}
