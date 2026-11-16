// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountEmail } from "@/components/AccountEmail";
import { PetNameForm } from "@/components/PetNameForm";
import { SettingsPetSection } from "@/components/SettingsPetSection";

const fetchMock = vi.fn<typeof fetch>();
const TOO_LONG = "Mochi the Magnificent Apple Muncher"; // 35 characters (mockup)

function progress(name: string) {
  return {
    name,
    coins: 0,
    applesToday: 0,
    feedingMinutesTowardNextApple: 0,
    feedingState: "STARVING",
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function patchBodies(): unknown[] {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === "PATCH")
    .map(([, init]) => JSON.parse(String(init?.body)));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("PetNameForm (US3, #10)", () => {
  it("shows the current name with the mockup hint", () => {
    render(<PetNameForm initialName="Mochi" />);

    expect(screen.getByLabelText("Pet name")).toHaveValue("Mochi");
    expect(
      screen.getByText("Up to 30 characters. Leave blank to use Mochi."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save name" }),
    ).toBeInTheDocument();
  });

  it("shows the length error and sends nothing for a 35-character name", async () => {
    const user = userEvent.setup();
    render(<PetNameForm initialName="Mochi" />);
    const input = screen.getByLabelText("Pet name");

    await user.clear(input);
    await user.type(input, TOO_LONG);
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(
      await screen.findByText(
        "Pet names can be up to 30 characters. This one has 35.",
      ),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves the trimmed name and confirms it", async () => {
    fetchMock.mockResolvedValue(json(200, progress("Biscuit")));
    const user = userEvent.setup();
    render(<PetNameForm initialName="Mochi" />);
    const input = screen.getByLabelText("Pet name");

    await user.clear(input);
    await user.type(input, "  Biscuit ");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Name saved. Your pet is now Biscuit.",
    );
    expect(patchBodies()).toEqual([{ name: "Biscuit" }]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/pet");
    expect(input).toHaveValue("Biscuit");
  });

  it("restores Mochi when the field is cleared and saved", async () => {
    fetchMock.mockResolvedValue(json(200, progress("Mochi")));
    const user = userEvent.setup();
    render(<PetNameForm initialName="Biscuit" />);

    await user.clear(screen.getByLabelText("Pet name"));
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Name saved. Your pet is now Mochi.",
    );
    expect(screen.getByLabelText("Pet name")).toHaveValue("Mochi");
  });

  it("shows the server error copy when saving fails", async () => {
    fetchMock.mockResolvedValue(
      json(500, {
        error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
      }),
    );
    const user = userEvent.setup();
    render(<PetNameForm initialName="Mochi" />);

    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
  });
});

describe("Settings Pet section (#10)", () => {
  it("loads the current pet name, then shows the form", async () => {
    fetchMock.mockResolvedValue(json(200, progress("Biscuit")));
    render(<SettingsPetSection />);

    expect(screen.getByText("Loading your pet…")).toBeInTheDocument();
    expect(await screen.findByLabelText("Pet name")).toHaveValue("Biscuit");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/pet");
  });

  it("shows an error with Try again when the pet cannot load", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    fetchMock.mockResolvedValueOnce(json(200, progress("Mochi")));
    const user = userEvent.setup();
    render(<SettingsPetSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again.",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Pet name")).toHaveValue("Mochi");
  });
});

describe("AccountEmail (#10)", () => {
  it("shows the signed-in email read-only", () => {
    render(<AccountEmail email="jo@school.edu" />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveValue("jo@school.edu");
    expect(input).toHaveAttribute("readonly");
  });
});
