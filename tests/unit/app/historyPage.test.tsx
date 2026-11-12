// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import HistoryPage from "@/app/(app)/history/page";

afterEach(() => {
  cleanup();
});

describe("History page (US8, #23)", () => {
  it("does not render fixture sessions or call the history API", () => {
    render(<HistoryPage />);

    expect(screen.getByText("Loading your sessions…")).toBeTruthy();
    expect(screen.queryByText("Essay draft: intro")).toBeNull();
    expect(screen.queryByText("No sessions yet")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
