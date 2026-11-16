import { createHash } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as requestReset } from "@/app/api/auth/password-reset/request/route";
import { resetTestDatabase, testPrisma } from "./testDb";

const NOW = new Date("2026-11-15T15:00:00.000Z");
const MS_PER_MINUTE = 60_000;
const IP = "203.0.113.5";
const ACCEPTED = {
  message: "If an account exists for that email, a reset link is on its way.",
};
const TOO_MANY = {
  error: {
    code: "TOO_MANY_REQUESTS",
    message: "Too many reset requests. Wait a few minutes, then try again.",
  },
};

type ResendCall = { to: string[]; text: string };
const resendCalls: ResendCall[] = [];
let resendStatus = 200;

function stubResend(): void {
  resendCalls.length = 0;
  resendStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!String(url).startsWith("https://api.resend.com/")) {
        throw new Error(`unexpected fetch to ${String(url)}`);
      }
      resendCalls.push(JSON.parse(String(init?.body)) as ResendCall);
      return new Response(JSON.stringify({ id: "email_1" }), {
        status: resendStatus,
      });
    }),
  );
}

function postReset(body: unknown, ip = IP): Promise<Response> {
  return requestReset(
    new Request("http://localhost/api/auth/password-reset/request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `${ip}, 10.0.0.1`,
        // A13: a forged Host must never reach the emailed link.
        host: "evil.example",
      },
      body: JSON.stringify(body),
    }),
  );
}

async function signUp(email: string): Promise<string> {
  const response = await signup(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: "sunflower22",
        timezone: "America/New_York",
      }),
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as { user: { id: string } };
  return body.user.id;
}

function tokenFromLastEmail(): string {
  const text = resendCalls.at(-1)?.text ?? "";
  const match = /reset-password\?token=([0-9a-f]{64})/.exec(text);
  return match?.[1] ?? "";
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("RESEND_FROM_EMAIL", "OnYou <reset@onyou.example>");
  vi.stubEnv("APP_URL", "https://onyou123.vercel.app");
  stubResend();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /api/auth/password-reset/request (US2, #24)", () => {
  it("emails a single-use link and stores only the token hash, expiring in 30 minutes", async () => {
    const userId = await signUp("owner@school.edu");

    const response = await postReset({ email: "owner@school.edu" });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(ACCEPTED);
    expect(resendCalls).toHaveLength(1);
    expect(resendCalls[0]?.to).toEqual(["owner@school.edu"]);
    expect(resendCalls[0]?.text).toContain(
      "https://onyou123.vercel.app/reset-password?token=",
    );
    expect(resendCalls[0]?.text).not.toContain("evil.example");

    const token = tokenFromLastEmail();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(body)).not.toContain(token);
    const rows = await testPrisma.passwordResetToken.findMany({
      where: { userId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).toBe(sha256(token));
    expect(rows[0]?.tokenHash).not.toBe(token);
    expect(rows[0]?.usedAt).toBeNull();
    expect(rows[0]?.expiresAt.toISOString()).toBe(
      new Date(NOW.getTime() + 30 * MS_PER_MINUTE).toISOString(),
    );
  });

  it("gives an unknown email the identical response without a token or email", async () => {
    await signUp("owner@school.edu");
    const known = await postReset({ email: "owner@school.edu" });
    const unknown = await postReset({ email: "nobody@school.edu" });

    expect(unknown.status).toBe(known.status);
    await expect(unknown.json()).resolves.toEqual(await known.json());
    expect(resendCalls).toHaveLength(1);
    await expect(testPrisma.passwordResetToken.count()).resolves.toBe(1);
  });

  it("finds the account when the email has other casing or spaces", async () => {
    await signUp("owner@school.edu");

    await postReset({ email: "  Owner@School.EDU " });

    expect(resendCalls).toHaveLength(1);
    expect(resendCalls[0]?.to).toEqual(["owner@school.edu"]);
  });

  it("invalidates the older link when a new one is requested", async () => {
    const userId = await signUp("owner@school.edu");
    await postReset({ email: "owner@school.edu" });
    const first = tokenFromLastEmail();

    await postReset({ email: "owner@school.edu" });
    const second = tokenFromLastEmail();

    const rows = await testPrisma.passwordResetToken.findMany({
      where: { userId },
    });
    expect(second).not.toBe(first);
    expect(rows.map((row) => row.tokenHash)).toEqual([sha256(second)]);
  });

  it("limits each email to 3 requests per 15 minutes, known or not", async () => {
    await signUp("owner@school.edu");
    for (const email of ["owner@school.edu", "nobody@school.edu"]) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        expect((await postReset({ email })).status).toBe(200);
      }
      const limited = await postReset({ email });
      expect(limited.status).toBe(429);
      await expect(limited.json()).resolves.toEqual(TOO_MANY);
    }
    expect(resendCalls).toHaveLength(3);

    vi.setSystemTime(new Date(NOW.getTime() + 15 * MS_PER_MINUTE));
    expect((await postReset({ email: "owner@school.edu" })).status).toBe(200);
  });

  it("limits each IP address to 10 requests per 15 minutes across emails", async () => {
    for (let index = 0; index < 10; index += 1) {
      const response = await postReset({ email: `user${index}@school.edu` });
      expect(response.status).toBe(200);
    }

    const limited = await postReset({ email: "user10@school.edu" });
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual(TOO_MANY);

    const otherIp = await postReset(
      { email: "user11@school.edu" },
      "198.51.100.7",
    );
    expect(otherIp.status).toBe(200);
  });

  it("keeps the counters in PostgreSQL, with the email hashed", async () => {
    await postReset({ email: "owner@school.edu" });
    await postReset({ email: "owner@school.edu" });

    const counters = await testPrisma.rateLimitCounter.findMany();
    expect(counters.map((row) => row.count)).toEqual([2, 2]);
    expect(JSON.stringify(counters)).not.toContain("owner@school.edu");
    expect(counters.some((row) => row.key.includes(IP))).toBe(true);
  });

  it("still gives the same response when Resend fails", async () => {
    await signUp("owner@school.edu");
    resendStatus = 500;

    const response = await postReset({ email: "owner@school.edu" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(ACCEPTED);
  });

  it("rejects an invalid email with a validation error", async () => {
    const response = await postReset({ email: "not-an-email" });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(resendCalls).toHaveLength(0);
  });
});
