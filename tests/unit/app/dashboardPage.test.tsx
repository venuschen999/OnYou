// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardErrorPage from "@/app/(app)/dashboard/error";
import DashboardLoadingPage from "@/app/(app)/dashboard/loading";
import HomePage, { metadata } from "@/app/(app)/dashboard/page";
import { SessionPresence } from "@/components/SessionPresence";
import type { PetProgressView } from "@/lib/api/pet";

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
  method: string;
  settled: boolean;
  resolve: (response: Response) => void;
  promise: Promise<Response>;
};

const requests: Pending[] = [];

function installFetch(): void {
  requests.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      let resolve: (response: Response) => void = () => undefined;
      const promise = new Promise<Response>((done) => {
        resolve = done;
      });
      requests.push({
        url: String(url),
        method: init?.method ?? "GET",
        settled: false,
        resolve,
        promise,
      });
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

function pet(overrides: Partial<PetProgressView> = {}): PetProgressView {
  return {
    name: "Mochi",
    coins: 0,
    applesToday: 0,
    feedingMinutesTowardNextApple: 0,
    feedingState: "STARVING",
    ...overrides,
  };
}

function activeSession() {
  return {
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
  };
}

async function resolveNext(
  url: string,
  body: unknown,
  status = 200,
): Promise<void> {
  const request = requests.find((item) => item.url === url && !item.settled);
  if (!request) throw new Error(`No pending ${url}`);
  request.settled = true;
  await act(async () => {
    request.resolve(jsonResponse(body, status));
    await request.promise;
  });
}

function renderHome(): void {
  render(
    <SessionPresence>
      <HomePage />
    </SessionPresence>,
  );
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

  it("shows the loading skeleton until GET /api/pet returns", async () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "Loading your dashboard" }),
    ).toBeTruthy();
    expect(screen.queryByText("Start focusing")).toBeNull();
    expect(requests.filter((request) => request.url === "/api/pet")).toEqual([
      expect.objectContaining({ method: "GET" }),
    ]);

    await resolveNext("/api/sessions/active", null);
    expect(
      screen.getByRole("heading", { name: "Loading your dashboard" }),
    ).toBeTruthy();

    await resolveNext("/api/pet", pet());
    expect(screen.getByText("Starving")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-loading")).toBeNull();
  });

  it("shows a new account as Mochi, Starving, with no coins or apples", async () => {
    renderHome();
    await resolveNext("/api/sessions/active", null);
    await resolveNext("/api/pet", pet());

    expect(screen.getByRole("img", { name: "Mochi is starving" })).toBeTruthy();
    expect(screen.getByText("Mochi")).toBeTruthy();
    expect(screen.getByText("Starving")).toBeTruthy();
    expect(screen.getByLabelText("Coins")).toHaveTextContent("0");
    expect(screen.getByRole("img", { name: "0 of 2 apples" })).toBeTruthy();
    expect(screen.getByText("0 of 25 min to the next apple")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Mochi hasn’t eaten today." }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Start focusing" }).getAttribute("href"),
    ).toBe("/focus");
  });

  it("shows one apple as Hungry with the returned coins and feeding minutes", async () => {
    renderHome();
    await resolveNext("/api/sessions/active", null);
    await resolveNext(
      "/api/pet",
      pet({
        name: "Biscuit",
        coins: 385,
        applesToday: 1,
        feedingMinutesTowardNextApple: 10,
        feedingState: "HUNGRY",
      }),
    );

    expect(screen.getByRole("img", { name: "Biscuit is hungry" })).toBeTruthy();
    expect(screen.getByText("Biscuit")).toBeTruthy();
    expect(screen.getByText("Hungry")).toBeTruthy();
    expect(screen.getByLabelText("Coins")).toHaveTextContent("385");
    expect(screen.getByRole("img", { name: "1 of 2 apples" })).toBeTruthy();
    expect(screen.getByText("10 of 25 min to the next apple")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "One apple down, one to go." }),
    ).toBeTruthy();
  });

  it("shows two apples as Full", async () => {
    renderHome();
    await resolveNext("/api/sessions/active", null);
    await resolveNext(
      "/api/pet",
      pet({
        coins: 460,
        applesToday: 2,
        feedingMinutesTowardNextApple: 0,
        feedingState: "FULL",
      }),
    );

    expect(screen.getByRole("img", { name: "Mochi is full" })).toBeTruthy();
    expect(screen.getByText("Full")).toBeTruthy();
    expect(screen.getByLabelText("Coins")).toHaveTextContent("460");
    expect(screen.getByRole("img", { name: "2 of 2 apples" })).toBeTruthy();
    expect(screen.getByText("Full for today")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Mochi is full for today." }),
    ).toBeTruthy();
  });

  it("shows a daily reset as Starving while keeping coins", async () => {
    // GET /api/pet contract (#19): a new feeding day returns 0 apples and
    // 0 minutes. Coins stay on the pet and never reset.
    renderHome();
    await resolveNext("/api/sessions/active", null);
    await resolveNext(
      "/api/pet",
      pet({
        coins: 460,
        applesToday: 0,
        feedingMinutesTowardNextApple: 0,
        feedingState: "STARVING",
      }),
    );

    expect(screen.getByText("Starving")).toBeTruthy();
    expect(screen.getByLabelText("Coins")).toHaveTextContent("460");
    expect(screen.getByRole("img", { name: "0 of 2 apples" })).toBeTruthy();
    expect(screen.getByText("0 of 25 min to the next apple")).toBeTruthy();
    expect(screen.queryByText("Full")).toBeNull();
  });

  it("shows Couldn’t load and retries GET /api/pet", async () => {
    renderHome();
    await resolveNext("/api/sessions/active", null);
    await resolveNext(
      "/api/pet",
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
      500,
    );

    expect(
      screen.getByRole("heading", { name: "Couldn’t load your dashboard" }),
    ).toBeTruthy();
    expect(screen.queryByText("Something went wrong.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      screen.getByRole("heading", { name: "Loading your dashboard" }),
    ).toBeTruthy();
    expect(
      requests.filter((request) => request.url === "/api/pet"),
    ).toHaveLength(2);

    await resolveNext("/api/pet", pet({ coins: 15 }));
    expect(screen.getByText("Starving")).toBeTruthy();
    expect(screen.getByLabelText("Coins")).toHaveTextContent("15");
  });

  it("disables Start focusing when the account session is active", async () => {
    renderHome();
    await resolveNext(
      "/api/pet",
      pet({
        coins: 385,
        applesToday: 1,
        feedingMinutesTowardNextApple: 10,
        feedingState: "HUNGRY",
      }),
    );
    await resolveNext("/api/sessions/active", activeSession());

    expect(
      screen.getByRole("button", { name: "Start focusing" }),
    ).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Start focusing" })).toBeNull();
    expect(
      screen.getByText(
        "One session at a time. Finish or give up the current one first.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("This session finishing earns the second apple."),
    ).toBeTruthy();
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
