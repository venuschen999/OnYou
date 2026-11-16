import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// #30 / AGENTS.md §3, §7: every signed-in screen has its own loading and
// error states.
const APP_GROUP = path.join(process.cwd(), "src/app/(app)");
const screens = readdirSync(APP_GROUP, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(path.join(APP_GROUP, entry.name, "page.tsx")),
  )
  .map((entry) => entry.name);

describe("signed-in screens have loading and error states", () => {
  it("finds the Home, Focus, History, and Settings screens", () => {
    expect(screens).toEqual(
      expect.arrayContaining(["dashboard", "focus", "history", "settings"]),
    );
  });

  it.each(screens)("%s has loading.tsx and error.tsx", (screen) => {
    expect(existsSync(path.join(APP_GROUP, screen, "loading.tsx"))).toBe(true);
    expect(existsSync(path.join(APP_GROUP, screen, "error.tsx"))).toBe(true);
  });
});
