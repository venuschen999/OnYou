import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// #30 / AGENTS.md §13: body text meets WCAG 2.2 AA (4.5:1) in light and dark.
const css = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const MIN_TEXT_CONTRAST = 4.5;

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
}

const light = tokens(/:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "");
const dark = tokens(
  /prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\n\s*\}/.exec(
    css,
  )?.[1] ?? "",
);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

// Foreground tokens used for text, on the backgrounds they appear on.
const TEXT_PAIRS: [string, string][] = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "tint"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["muted", "tint"],
  ["pine", "bg"],
  ["pine", "surface"],
  ["pine", "tint"],
  ["pine-ink", "pine"],
  ["plum", "bg"],
  ["plum", "surface"],
];

describe("text contrast (WCAG 2.2 AA)", () => {
  it.each(
    TEXT_PAIRS.flatMap(([fg, bg]) => [
      ["light", fg, bg] as const,
      ["dark", fg, bg] as const,
    ]),
  )("%s: %s on %s is at least 4.5:1", (mode, fg, bg) => {
    const palette = mode === "light" ? light : dark;
    expect(palette[fg], `--${fg}`).toBeDefined();
    expect(palette[bg], `--${bg}`).toBeDefined();
    expect(
      contrast(palette[fg] ?? "", palette[bg] ?? ""),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

// --leaf (success) is 3.96:1 on white in light mode and --apple is 4.27:1 on
// surface in dark mode: fine for icons and fills, too low for text.
describe("colors too light for text", () => {
  it("never uses the success or apple color for text", () => {
    const offenders = sourceFiles(path.join(process.cwd(), "src")).filter(
      (file) => /\btext-(success|apple)\b/.test(readFileSync(file, "utf8")),
    );
    expect(offenders.map((file) => path.relative(process.cwd(), file))).toEqual(
      [],
    );
  });
});
