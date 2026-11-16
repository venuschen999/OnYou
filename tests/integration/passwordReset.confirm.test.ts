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
import { POST as login } from "@/app/api/auth/login/route";
import { POST as confirmReset } from "@/app/api/auth/password-reset/confirm/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { GET as getActive } from "@/app/api/sessions/active/route";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const NOW = new Date("2026-11-15T15:00:00.000Z");
const MS_PER_MINUTE = 60_000;
const OLD_PASSWORD = "sunflower22";
const NEW_PASSWORD = "moonlight77";
const TOKEN = "b".repeat(64);
const INVALID_LINK = {
  error: {
    code: "RESET_LINK_INVALID",
    message: "This link no longer works.",
  },
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonPost(path: string, body: unknown, cookie?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookie) headers.set("cookie", `${AUTH_COOKIE_NAME}=${cookie}`);
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function authTokenFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(header);
  return match?.[1] ?? "";
}

async function signUp(email: string): Promise<{ id: string; cookie: string }> {
  const response = await signup(
    jsonPost("/api/auth/signup", {
      email,
      password: OLD_PASSWORD,
      timezone: "America/New_York",
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as { user: { id: string } };
  return { id: body.user.id, cookie: authTokenFrom(response) };
}

async function issueToken(
  userId: string,
  token = TOKEN,
  minutesValid = 30,
): Promise<void> {
  await testPrisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(NOW.getTime() + minutesValid * MS_PER_MINUTE),
    },
  });
}

function postConfirm(body: unknown): Promise<Response> {
  return confirmReset(jsonPost("/api/auth/password-reset/confirm", body));
}

function postLogin(email: string, password: string): Promise<Response> {
  return login(jsonPost("/api/auth/login", { email, password }));
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /api/auth/password-reset/confirm (US2, #25)", () => {
  it("sets the new password, signs out everywhere, and uses up the link", async () => {
    const user = await signUp("owner@school.edu");
    await issueToken(user.id);
    const before = await testPrisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    const response = await postConfirm({
      token: TOKEN,
      password: NEW_PASSWORD,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Password updated. Log in with your new password.",
    });
    // A15: this browser's cookie is cleared too.
    expect(response.headers.get("set-cookie")).toMatch(
      new RegExp(`${AUTH_COOKIE_NAME}=;`),
    );

    const after = await testPrisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(after.tokenVersion).toBe(before.tokenVersion + 1);
    expect(after.passwordHash).not.toBe(before.passwordHash);
    expect(after.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(after.passwordHash).not.toContain(NEW_PASSWORD);
    const row = await testPrisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: sha256(TOKEN) },
    });
    expect(row.usedAt?.toISOString()).toBe(NOW.toISOString());

    const oldSession = await getActive(
      new Request("http://localhost/api/sessions/active", {
        headers: { cookie: `${AUTH_COOKIE_NAME}=${user.cookie}` },
      }),
    );
    expect(oldSession.status).toBe(401);
    expect((await postLogin("owner@school.edu", OLD_PASSWORD)).status).toBe(
      401,
    );
    expect((await postLogin("owner@school.edu", NEW_PASSWORD)).status).toBe(
      200,
    );
  });

  it("rejects a link that was already used and leaves the password alone", async () => {
    const user = await signUp("owner@school.edu");
    await issueToken(user.id);
    await postConfirm({ token: TOKEN, password: NEW_PASSWORD });
    const afterFirst = await testPrisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    const reuse = await postConfirm({ token: TOKEN, password: "thirdpass99" });

    expect(reuse.status).toBe(400);
    await expect(reuse.json()).resolves.toEqual(INVALID_LINK);
    const afterReuse = await testPrisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(afterReuse.passwordHash).toBe(afterFirst.passwordHash);
    expect(afterReuse.tokenVersion).toBe(afterFirst.tokenVersion);
  });

  it("accepts a link just before 30 minutes and rejects it once they pass", async () => {
    const user = await signUp("owner@school.edu");
    await issueToken(user.id, TOKEN);
    await issueToken(user.id, "c".repeat(64));
    const expiry = NOW.getTime() + 30 * MS_PER_MINUTE;

    vi.setSystemTime(new Date(expiry));
    const expired = await postConfirm({
      token: "c".repeat(64),
      password: NEW_PASSWORD,
    });
    expect(expired.status).toBe(400);
    await expect(expired.json()).resolves.toEqual(INVALID_LINK);

    vi.setSystemTime(new Date(expiry - 1));
    const inTime = await postConfirm({ token: TOKEN, password: NEW_PASSWORD });
    expect(inTime.status).toBe(200);
  });

  it("gives an unknown or missing token the same error", async () => {
    await signUp("owner@school.edu");

    for (const body of [
      { token: "d".repeat(64), password: NEW_PASSWORD },
      { token: "", password: NEW_PASSWORD },
      { password: NEW_PASSWORD },
    ]) {
      const response = await postConfirm(body);
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual(INVALID_LINK);
    }
  });

  it("rejects a password outside 8 to 15 characters without using the link", async () => {
    const user = await signUp("owner@school.edu");
    await issueToken(user.id);

    const response = await postConfirm({ token: TOKEN, password: "short" });

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      error: { code: string; fields?: Record<string, string> };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields?.password).toBe(
      "Use 8 to 15 characters. This one has 5.",
    );
    const row = await testPrisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: sha256(TOKEN) },
    });
    expect(row.usedAt).toBeNull();
  });

  it("deletes the account's other unused links", async () => {
    const user = await signUp("owner@school.edu");
    await issueToken(user.id, TOKEN);
    await issueToken(user.id, "e".repeat(64));

    await postConfirm({ token: TOKEN, password: NEW_PASSWORD });

    const rows = await testPrisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    expect(rows.map((row) => row.tokenHash)).toEqual([sha256(TOKEN)]);
  });

  it("does not abandon an Active focus session (PRD v2.9 US2)", async () => {
    const user = await signUp("owner@school.edu");
    await issueToken(user.id);
    const session = await testPrisma.focusSession.create({
      data: buildSession(user.id, {
        startTime: NOW,
        endTime: new Date(NOW.getTime() + 25 * MS_PER_MINUTE),
        lastHeartbeatAt: NOW,
      }),
    });

    await postConfirm({ token: TOKEN, password: NEW_PASSWORD });

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(NOW.toISOString());
  });
});
