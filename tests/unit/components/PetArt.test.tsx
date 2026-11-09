// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PetArt, type PetBowl, type PetVisualState } from "@/components/PetArt";

type MockupPet = (state: string, bowl?: number | null) => string;
type NormalizedNode = {
  tag: string;
  attributes: string[];
  children: NormalizedNode[];
};

// AGENTS.md §7: reuse the mockup's in-code SVG. The expected markup comes from
// the mockup's own pet() function, so any substituted art fails this test.
function loadMockupPet(): MockupPet {
  const html = readFileSync(
    path.resolve(__dirname, "../../../OnYou_web_mockups.html"),
    "utf8",
  );
  const source = /function pet\(state, bowl\)\{[\s\S]*?\n {2}\}\n/.exec(html);
  if (!source) throw new Error("pet() not found in OnYou_web_mockups.html");
  return new Function(`${source[0]}; return pet;`)() as MockupPet;
}

function normalize(element: Element): NormalizedNode {
  return {
    tag: element.tagName.toLowerCase(),
    attributes: Array.from(element.attributes)
      .map((attribute) => `${attribute.name}=${attribute.value}`)
      .sort(),
    children: Array.from(element.children).map(normalize),
  };
}

function parseSvg(markup: string): Element {
  const container = document.createElement("div");
  container.innerHTML = markup;
  const svg = container.querySelector("svg");
  if (!svg) throw new Error("no svg in markup");
  return svg;
}

const mockupPet = loadMockupPet();
const STATES: PetVisualState[] = ["starving", "hungry", "full", "slapped"];
const BOWLS: (PetBowl | undefined)[] = [undefined, 0, 1, 2];
const CASES = STATES.flatMap((state) =>
  BOWLS.map((bowl) => [state, bowl] as const),
);

afterEach(() => {
  cleanup();
});

describe("PetArt (docs/agent-memory/pet.md P3)", () => {
  it.each(CASES)(
    "matches the mockup SVG for state %s with bowl %s",
    (state, bowl) => {
      render(<PetArt state={state} bowl={bowl} label="Mochi" />);

      const rendered = screen.getByRole("img").querySelector("svg");
      expect(rendered).not.toBeNull();
      const expected = parseSvg(mockupPet(state, bowl ?? null));
      expect(normalize(rendered as Element)).toEqual(normalize(expected));
    },
  );

  it("exposes the label as an image and hides the SVG from assistive tech", () => {
    render(<PetArt state="hungry" label="Mochi is waiting" />);

    const image = screen.getByRole("img", { name: "Mochi is waiting" });
    expect(image.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
