// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardErrorPage from "@/app/(app)/dashboard/error";
import DashboardLoadingPage from "@/app/(app)/dashboard/loading";
import HomePage, { metadata } from "@/app/(app)/dashboard/page";
import { HomeDashboard } from "@/components/HomeDashboard";
import { SessionPresence } from "@/components/SessionPresence";
import { hungryPet } from "../../fixtures/petProgress";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

type Pending = {
  url: string;
  resolve: (response: Response) => void;
  promise: Promise<Response>;
};

const requests: Pending[] = [];

function installFetch(): void {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      let resolve: (response: Response) => void = () => undefined;
      const promise = new Promise<Response>((done) => {
        resolve = done;
      });
      requests.push({ url: String(url), resolve, promise });
      return promise;
    }),
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
    ],
  });
  installFetch();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Home page (#20)", () => {
  it("keeps the Home title", () => {
    expect(metadata.title).toBe("Home");
  });

  it("does not call GET /api/pet while issue #19 is open", async () => {
    render(
      <SessionPresence>
        <HomePage />
      </SessionPresence>,
    );

    expect(
      screen.getByRole("heading", { name: "Couldn’t load your dashboard" }),
    ).toBeTruthy();
    expect(requests.map((request) => request.url)).not.toContain("/api/pet");

    await act(async () => {
      requests[0]?.resolve(jsonResponse(null));
      await requests[0]?.promise;
    });

    expect(requests.map((request) => request.url)).not.toContain("/api/pet");
    expect(screen.queryByText("Start focusing")).toBeNull();
  });

  it("disables Start focusing when the account session is active", async () => {
    render(
      <SessionPresence>
        <HomeDashboard pet={hungryPet} status="ready" />
      </SessionPresence>,
    );

    await act(async () => {
      requests[0]?.resolve(
        jsonResponse({
          id: "session_1",
          taskName: "Essay draft: intro",
          durationMinutes: 25,
          status: "ACTIVE",
          startTime: "2026-11-09T15:00:00.000Z",
          endTime: "2026-11-09T18:00:00.000Z",
          lastHeartbeatAt: "2026-11-09T15:00:00.000Z",
          coinsEarned: 0,
          feedingMinutesEarned: 0,
          applesEarned: 0,
        }),
      );
      await requests[0]?.promise;
    });

    expect(
      screen.getByRole("button", { name: "Start focusing" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "One session at a time. Finish or give up the current one first.",
      ),
    ).toBeTruthy();
    expect(requests.some((request) => request.url === "/api/pet")).toBe(false);
  });

  it("renders the route loading and error states", () => {
    render(<DashboardLoadingPage />);
    expect(
      screen.getByRole("heading", { name: "Loading your dashboard" }),
    ).toBeTruthy();
    cleanup();

    const reset = vi.fn();
    render(<DashboardErrorPage error={new Error("hidden")} reset={reset} />);
    expect(screen.queryByText("hidden")).toBeNull();
    screen.getByRole("button", { name: "Try again" }).click();
    expect(reset).toHaveBeenCalledOnce();
  });
});
