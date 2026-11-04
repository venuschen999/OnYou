import { describe, expect, it } from "vitest";
import RootPage from "@/app/page";

function redirectTarget(error: unknown): string | undefined {
  const digest = (error as { digest?: unknown } | null)?.digest;
  // Next encodes redirects as "NEXT_REDIRECT;<type>;<url>;<status>;".
  return typeof digest === "string" ? digest.split(";")[2] : undefined;
}

describe("root page (docs/agent-memory/auth.md A8.2)", () => {
  it("redirects / to /dashboard", () => {
    let caught: unknown;
    try {
      RootPage();
    } catch (error) {
      caught = error;
    }

    expect(redirectTarget(caught)).toBe("/dashboard");
  });
});
