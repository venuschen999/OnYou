// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/AppHeader";

let currentPath = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

afterEach(() => {
  cleanup();
});

describe("AppHeader (AGENTS.md §7, #9)", () => {
  it("shows the wordmark and Home, History, Settings in that order", () => {
    render(<AppHeader />);

    expect(screen.getByRole("banner")).toHaveTextContent("OnYou");
    const nav = screen.getByRole("navigation");
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Home",
      "History",
      "Settings",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/dashboard",
      "/history",
      "/settings",
    ]);
  });

  it.each([
    ["/dashboard", "Home"],
    ["/history", "History"],
    ["/settings", "Settings"],
  ])("marks only the current page at %s", (path, label) => {
    currentPath = path;
    render(<AppHeader />);

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual([label]);
  });
});
