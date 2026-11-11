import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Recursive: () => ({ variable: "--font-recursive" }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import RootLayout, { metadata } from "@/app/layout";

describe("root layout", () => {
  it("renders one English document shell around the page", () => {
    const html = renderToStaticMarkup(
      <RootLayout params={Promise.resolve({})}>
        <p>Focus</p>
      </RootLayout>,
    );

    expect(html).toContain('lang="en"');
    expect(html).toContain("--font-recursive");
    expect(html).toContain("<p>Focus</p>");
  });

  it("describes the product in the document metadata", () => {
    expect(metadata.title).toBe("OnYou");
    expect(metadata.description).toBe(
      "Turn focus time into care for your virtual pet.",
    );
  });
});
