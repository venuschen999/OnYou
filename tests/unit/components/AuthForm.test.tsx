// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/AuthForm";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: vi.fn() }),
}));

const fetchMock = vi.fn<typeof fetch>();
const USER = { id: "u1", email: "jo@school.edu", timezone: "America/New_York" };
const SERVER_ERROR_COPY = "Something went wrong. Try again.";
const LOGIN_ERROR_COPY =
  "Email or password is incorrect. Check both and try again.";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
): Response {
  return jsonResponse(status, { error: { code, message, fields } });
}

function emailInput(): HTMLElement {
  return screen.getByLabelText("Email");
}

function passwordInput(): HTMLElement {
  return screen.getByLabelText("Password");
}

async function fillAndSubmit(
  email: string,
  password: string,
  buttonName: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.type(emailInput(), email);
  await user.type(passwordInput(), password);
  await user.click(screen.getByRole("button", { name: buttonName }));
}

function requestBody(callIndex = 0): unknown {
  const init = fetchMock.mock.calls[callIndex]?.[1];
  return JSON.parse(String(init?.body));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  replaceMock.mockReset();
});

describe("AuthForm signup (US1, #9)", () => {
  it("shows labeled fields, the password hint, the submit button, and a Log in link", () => {
    render(<AuthForm mode="signup" />);

    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(emailInput()).toHaveAttribute("type", "email");
    expect(passwordInput()).toHaveAttribute("type", "password");
    expect(screen.getByText("8 to 15 characters")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("shows the password length error inline and sends no request", async () => {
    render(<AuthForm mode="signup" />);

    await fillAndSubmit("jo@school.edu", "sun", "Create account");

    const error = screen.getByText("Use 8 to 15 characters. This one has 3.");
    expect(passwordInput()).toHaveAttribute("aria-invalid", "true");
    expect(passwordInput().getAttribute("aria-describedby")).toContain(
      error.id,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows every field error at once", async () => {
    render(<AuthForm mode="signup" />);

    await fillAndSubmit("not-an-email", "sun", "Create account");

    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Use 8 to 15 characters. This one has 3."),
    ).toBeInTheDocument();
    expect(emailInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("clears only the edited field's error", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);
    await fillAndSubmit("not-an-email", "sun", "Create account");

    await user.type(passwordInput(), "flower22");

    expect(
      screen.queryByText("Use 8 to 15 characters. This one has 3."),
    ).not.toBeInTheDocument();
    expect(passwordInput()).not.toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();
  });

  it("sends email, password, and the browser timezone, then goes Home", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { user: USER }));
    render(<AuthForm mode="signup" />);

    await fillAndSubmit("jo@school.edu", "sunflower22", "Create account");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/signup");
    expect(requestBody()).toEqual({
      email: "jo@school.edu",
      password: "sunflower22",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });

  it("disables the button with a spinner while waiting and sends one request", async () => {
    let resolveFetch: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);
    await user.type(emailInput(), "jo@school.edu");
    await user.type(passwordInput(), "sunflower22");

    const button = screen.getByRole("button", { name: "Create account" });
    await user.click(button);
    await user.click(button);

    const pending = screen.getByRole("button", { name: /Creating account…/ });
    expect(pending).toBeDisabled();
    expect(within(pending).getByTestId("spinner")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse(201, { user: USER }));
    await vi.waitFor(() => expect(replaceMock).toHaveBeenCalled());
  });

  it("shows the email-in-use error with a Log in link", async () => {
    const message = "An account with this email already exists.";
    fetchMock.mockResolvedValue(
      errorResponse(409, "EMAIL_IN_USE", message, { email: message }),
    );
    render(<AuthForm mode="signup" />);

    await fillAndSubmit("jo@school.edu", "sunflower22", "Create account");

    const error = await screen.findByText(/already exists/);
    expect(error).toHaveTextContent(`${message} Log in instead.`);
    expect(within(error).getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(emailInput()).toHaveAttribute("aria-invalid", "true");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows the server error copy when the network fails and re-enables the button", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<AuthForm mode="signup" />);

    await fillAndSubmit("jo@school.edu", "sunflower22", "Create account");

    expect(await screen.findByText(SERVER_ERROR_COPY)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("shows the server error copy for a 500 response", async () => {
    fetchMock.mockResolvedValue(
      errorResponse(500, "INTERNAL_ERROR", "Something went wrong. Try again."),
    );
    render(<AuthForm mode="signup" />);

    await fillAndSubmit("jo@school.edu", "sunflower22", "Create account");

    expect(await screen.findByText(SERVER_ERROR_COPY)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe("AuthForm login (US1, #9)", () => {
  it("shows Welcome back, Log in, and Create an account, with no Forgot password link", () => {
    render(<AuthForm mode="login" />);

    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/signup");
    expect(
      screen.queryByRole("link", { name: /forgot password/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("8 to 15 characters")).not.toBeInTheDocument();
  });

  it("shows one error for wrong credentials, linked to both fields", async () => {
    fetchMock.mockResolvedValue(
      errorResponse(401, "INVALID_CREDENTIALS", LOGIN_ERROR_COPY),
    );
    render(<AuthForm mode="login" />);

    await fillAndSubmit("jo@school.edu", "wrongpass1", "Log in");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(LOGIN_ERROR_COPY);
    expect(screen.getAllByText(LOGIN_ERROR_COPY)).toHaveLength(1);
    for (const input of [emailInput(), passwordInput()]) {
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    }
  });

  it("shows Logging in… while waiting and goes Home on success", async () => {
    let resolveFetch: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<AuthForm mode="login" />);

    await fillAndSubmit("jo@school.edu", "sunflower22", "Log in");

    expect(screen.getByRole("button", { name: /Logging in…/ })).toBeDisabled();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/login");
    expect(requestBody()).toEqual({
      email: "jo@school.edu",
      password: "sunflower22",
    });

    resolveFetch(jsonResponse(200, { user: USER }));
    await vi.waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/dashboard"),
    );
  });

  it("announces errors politely (AGENTS.md §13)", async () => {
    render(<AuthForm mode="login" />);

    await fillAndSubmit("not-an-email", "sun", "Log in");

    const emailError = screen.getByText("Enter a valid email address.");
    expect(emailError).toHaveAttribute("aria-live", "polite");
  });
});
