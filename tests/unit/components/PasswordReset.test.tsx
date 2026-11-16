// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { PasswordUpdatedNotice } from "@/components/PasswordUpdatedNotice";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

const replaceMock = vi.fn();
const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: vi.fn() }),
  useSearchParams: () => search.params,
}));

const fetchMock = vi.fn<typeof fetch>();
const ACCEPTED = {
  message: "If an account exists for that email, a reset link is on its way.",
};
const TOO_MANY = "Too many reset requests. Wait a few minutes, then try again.";
const TOKEN = "f".repeat(64);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestCall(index = 0): { url: string; body: unknown } {
  const [url, init] = fetchMock.mock.calls[index] ?? [];
  return { url: String(url), body: JSON.parse(String(init?.body)) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  search.params = new URLSearchParams();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  replaceMock.mockReset();
});

describe("Forgot password (US2, #25)", () => {
  it("sends the email and shows Check your email with that address", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, ACCEPTED));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    expect(
      screen.getByRole("heading", { name: "Reset your password" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enter the email for your account. A reset link will be sent if the account exists.",
      ),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "jo@school.edu");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(requestCall()).toEqual({
      url: "/api/auth/password-reset/request",
      body: { email: "jo@school.edu" },
    });
    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "If an account exists for jo@school.edu, a reset link is on its way. The link works once and expires in 30 minutes.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to log in" }),
    ).toHaveAttribute("href", "/login");
  });

  it("sends another link to the same address", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, ACCEPTED));
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "jo@school.edu");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    await screen.findByRole("heading", { name: "Check your email" });

    await user.click(screen.getByRole("button", { name: "Send another link" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestCall(1).body).toEqual({ email: "jo@school.edu" });
  });

  it("shows the rate-limit message and stays on the form", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, {
        error: { code: "TOO_MANY_REQUESTS", message: TOO_MANY },
      }),
    );
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "jo@school.edu");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(TOO_MANY);
    expect(
      screen.getByRole("heading", { name: "Reset your password" }),
    ).toBeInTheDocument();
  });

  it("shows an email error and sends nothing for an invalid address", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Set a new password (US2, #25)", () => {
  it("explains that saving signs out everywhere", () => {
    render(<ResetPasswordForm token={TOKEN} />);

    expect(
      screen.getByRole("heading", { name: "Set a new password" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "8 to 15 characters. Saving signs you out everywhere, including any session in progress.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the length error inline and sends nothing", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token={TOKEN} />);
    await user.type(screen.getByLabelText("New password"), "short");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(
      await screen.findByText("Use 8 to 15 characters. This one has 5."),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves the password with the token and goes to login with the updated notice", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        message: "Password updated. Log in with your new password.",
      }),
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm token={TOKEN} />);
    await user.type(screen.getByLabelText("New password"), "moonlight77");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(requestCall()).toEqual({
      url: "/api/auth/password-reset/confirm",
      body: { token: TOKEN, password: "moonlight77" },
    });
    await vi.waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?reset=done"),
    );
  });

  it("shows This link no longer works when the server rejects the link", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: "RESET_LINK_INVALID",
          message: "This link no longer works.",
        },
      }),
    );
    const user = userEvent.setup();
    render(<ResetPasswordForm token={TOKEN} />);
    await user.type(screen.getByLabelText("New password"), "moonlight77");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(
      await screen.findByRole("heading", { name: "This link no longer works" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reset links work once and expire after 30 minutes. A newer link also replaces older ones. Request a new link to continue.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Send a new link" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(
      screen.getByRole("link", { name: "Back to log in" }),
    ).toHaveAttribute("href", "/login");
  });

  it("shows This link no longer works at once when the link has no token", () => {
    render(<ResetPasswordForm token={null} />);

    expect(
      screen.getByRole("heading", { name: "This link no longer works" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });
});

describe("Password updated notice on login (US2, #25)", () => {
  it("shows the notice after a reset", () => {
    search.params = new URLSearchParams("reset=done");
    render(<PasswordUpdatedNotice />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Password updated. Log in with your new password.",
    );
  });

  it("shows nothing on a normal visit", () => {
    render(<PasswordUpdatedNotice />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
