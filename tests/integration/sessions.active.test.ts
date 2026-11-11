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
import { GET as getActive } from "@/app/api/sessions/active/route";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const PASSWORD = "sunflower22";
const TIMEZONE = "America/New_York";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MINUTES = 25;
const END = new Date(NOW.getTime() + DURATION_MINUTES * MS_PER_MINUTE);

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authTokenFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(header);
  return match?.[1] ?? "";
}

function activeRequest(token?: string): Request {
  const headers = new Headers();
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  return new Request("http://localhost/api/sessions/active", { headers });
}

async function signUp(email: string): Promise<{ id: string; token: string }> {
  const response = await signup(
    jsonRequest("/api/auth/signup", {
      email,
      password: PASSWORD,
      timezone: TIMEZONE,
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as { user: { id: string } };
  return { id: body.user.id, token: authTokenFrom(response) };
}

async function insertSession(
  userId: string,
  overrides: Parameters<typeof buildSession>[1] = {},
) {
  return testPrisma.focusSession.create({
    data: buildSession(userId, {
      taskName: "Essay draft: intro",
      durationMinutes: DURATION_MINUTES,
      status: "ACTIVE",
      startTime: NOW,
      endTime: END,
      lastHeartbeatAt: NOW,
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
      ...overrides,
    }),
  });
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

describe("GET /api/sessions/active (US5, #13)", () => {
  it("requires authentication and does not resolve another account's session", async () => {
    const owner = await signUp("owner-active@school.edu");
    const session = await insertSession(owner.id, {
      lastHeartbeatAt: new Date(NOW.getTime() - 30 * MS_PER_SECOND),
      coinsEarned: 5,
    });

    const missing = await getActive(activeRequest());
    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.coinsEarned).toBe(5);
  });

  it("returns the owner's active session and does not renew the heartbeat", async () => {
    const user = await signUp("reader@school.edu");
    const session = await insertSession(user.id);

    const response = await getActive(activeRequest(user.token));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-session-token")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    const body = await response.json();
    expect(body).toMatchObject({
      id: session.id,
      taskName: "Essay draft: intro",
      durationMinutes: DURATION_MINUTES,
      status: "ACTIVE",
      startTime: NOW.toISOString(),
      endTime: END.toISOString(),
      lastHeartbeatAt: NOW.toISOString(),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    expect(JSON.stringify(body)).not.toMatch(/token/i);
  });

  it("returns null when this account has no active session", async () => {
    const owner = await signUp("owner-empty@school.edu");
    const other = await signUp("other-active@school.edu");
    await insertSession(owner.id);

    const response = await getActive(activeRequest(other.token));

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("abandons a lapsed session before returning and then returns null", async () => {
    const user = await signUp("lapsed@school.edu");
    const session = await insertSession(user.id, {
      lastHeartbeatAt: new Date(NOW.getTime() - 30 * MS_PER_SECOND),
      coinsEarned: 4,
      feedingMinutesEarned: 4,
      applesEarned: 1,
    });

    const response = await getActive(activeRequest(user.token));

    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ABANDONED");
    expect(stored.coinsEarned).toBe(0);
    expect(stored.feedingMinutesEarned).toBe(0);
    expect(stored.applesEarned).toBe(0);
  });

  it("returns a presence-met session that is past its end and still active", async () => {
    const user = await signUp("holding@school.edu");
    const endTime = new Date(NOW.getTime() - 5 * MS_PER_MINUTE);
    const session = await insertSession(user.id, {
      endTime,
      lastHeartbeatAt: new Date(endTime.getTime() - 10 * MS_PER_SECOND),
    });

    const response = await getActive(activeRequest(user.token));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: session.id,
      status: "ACTIVE",
      endTime: endTime.toISOString(),
      coinsEarned: 0,
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(
      new Date(endTime.getTime() - 10 * MS_PER_SECOND).toISOString(),
    );
  });
});
