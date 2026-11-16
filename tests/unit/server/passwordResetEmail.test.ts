import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildResetLink,
  sendPasswordResetEmail,
} from "@/lib/server/passwordResetEmail";

const TOKEN = "a".repeat(64);
const ENV = {
  RESEND_API_KEY: "re_test_key",
  RESEND_FROM_EMAIL: "OnYou <reset@onyou.example>",
  APP_URL: "https://onyou123.vercel.app",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// docs/agent-memory/auth.md A13.
describe("buildResetLink", () => {
  it("uses APP_URL without a trailing slash", () => {
    expect(
      buildResetLink(TOKEN, { APP_URL: "https://onyou123.vercel.app/" }),
    ).toBe(`https://onyou123.vercel.app/reset-password?token=${TOKEN}`);
  });

  it("falls back to the Vercel deployment URL on previews", () => {
    expect(
      buildResetLink(TOKEN, { VERCEL_URL: "onyou123-abc.vercel.app" }),
    ).toBe(`https://onyou123-abc.vercel.app/reset-password?token=${TOKEN}`);
  });

  it("refuses to build a link with no configured base URL", () => {
    expect(() => buildResetLink(TOKEN, {})).toThrow();
  });
});

// docs/agent-memory/auth.md A12: email goes only through Resend.
describe("sendPasswordResetEmail", () => {
  it("posts the reset email to the Resend API", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ id: "email_1" })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const link = buildResetLink(TOKEN, ENV);

    await sendPasswordResetEmail({ to: "owner@school.edu", link }, ENV);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer re_test_key");
    expect(headers.get("content-type")).toBe("application/json");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: ENV.RESEND_FROM_EMAIL,
      to: ["owner@school.edu"],
      subject: "Reset your OnYou password",
    });
    expect(body.text).toBe(
      `Someone asked to reset the password for your OnYou account. Open this link to choose a new password: ${link} The link works once and expires in 30 minutes. If you didn't ask for this, ignore this email; your password stays the same.`,
    );
  });

  it("rejects when Resend does not accept the email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );

    await expect(
      sendPasswordResetEmail(
        { to: "owner@school.edu", link: buildResetLink(TOKEN, ENV) },
        ENV,
      ),
    ).rejects.toThrow();
  });

  it("rejects when the Resend settings are missing", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      sendPasswordResetEmail(
        { to: "owner@school.edu", link: "https://x/reset-password?token=t" },
        { APP_URL: ENV.APP_URL },
      ),
    ).rejects.toThrow();
  });
});
