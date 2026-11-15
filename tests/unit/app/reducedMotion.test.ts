import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// US7 / AGENTS.md §13: the slap lasts under a second and stops for users who
// prefer less motion. Guards the rule SessionResult relies on (#17).
const css = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

describe("slap animation and reduced motion", () => {
  it("runs the slap once for under one second", () => {
    expect(css).toMatch(
      /\.pet-slap\s*\{[^}]*animation:\s*pet-slap\s+0?\.\d+s[^}]*\b1;/,
    );
  });

  it("turns the slap off when the user prefers reduced motion", () => {
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.pet-slap\s*\{\s*animation:\s*none;/,
    );
  });
});
