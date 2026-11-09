import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Page from "@/app/page";

describe("home page", () => {
  it("shows the product name and the focus-time description", () => {
    const html = renderToStaticMarkup(<Page />);

    expect(html).toContain("<h1");
    expect(html).toContain(">OnYou</h1>");
    expect(html).toContain("Turn focus time into care for your virtual pet.");
  });
});
