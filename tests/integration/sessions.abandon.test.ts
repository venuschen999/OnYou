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
import { POST as abandon } from "@/app/api/sessions/[id]/abandon/route";
import { POST as heartbeat } from "@/app/api/sessions/[id]/heartbeat/route";
import { getFeedingDay } from "@/lib/domain/feedingDay";
import { PRESENCE_GRACE_SECONDS } from "@/lib/domain/presence";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const PASSWORD = "sunflower22";
const TIMEZONE = "America/New_York";
const NOW = new Date("2026-11-15T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MINUTES = 25;
const END = new Date(NOW.getTime() + DURATION_MINUTES * MS_PER_MINUTE);
const GRACE_MS = PRESENCE_GRACE_SECONDS * MS_PER_SECOND;
const SIX_MINUTES_IN = new Date(NOW.getTime() + 6 * MS_PER_MINUTE);
const EARLIER_COINS = 30;
const EARLIER_FEEDING = { feedingMinutes: 30, apples: 1 };

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

function sessionRequest(
  action: "abandon" | "heartbeat",
  token: string | undefined,
  sessionId: string,
): Request {
  const headers = new Headers();
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  return new Request(`http://localhost/api/sessions/${sessionId}/${action}`, {
    method: "POST",
    headers,
  });
}

function postAbandon(
  token: string | undefined,
  sessionId: string,
): Promise<Response> {
  return abandon(sessionRequest("abandon", token, sessionId), {
    params: Promise.resolve({ id: sessionId }),
  });
}

function postHeartbeat(token: string, sessionId: string): Promise<Response> {
  return heartbeat(sessionRequest("heartbeat", token, sessionId), {
    params: Promise.resolve({ id: sessionId }),
  });
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
      lastHeartbeatAt: SIX_MINUTES_IN,
      ...overrides,
    }),
  });
}

function feedingDayOfEnd(): Date {
  return new Date(`${getFeedingDay(END, TIMEZONE)}T00:00:00.000Z`);
}

// Earlier rewards on the same feeding day, so tests can show they survive.
async function seedEarlierRewards(userId: string): Promise<void> {
  const pet = await testPrisma.pet.update({
    where: { userId },
    data: { coins: EARLIER_COINS },
  });
  await testPrisma.dailyFeeding.create({
    data: { petId: pet.id, feedingDay: feedingDayOfEnd(), ...EARLIER_FEEDING },
  });
}

async function balances(userId: string) {
  const pet = await testPrisma.pet.findUniqueOrThrow({ where: { userId } });
  const feeding = await testPrisma.dailyFeeding.findUnique({
    where: {
      petId_feedingDay: { petId: pet.id, feedingDay: feedingDayOfEnd() },
    },
  });
  return {
    coins: pet.coins,
    feedingMinutes: feeding?.feedingMinutes ?? 0,
    apples: feeding?.apples ?? 0,
  };
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SIX_MINUTES_IN);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("POST /api/sessions/{id}/abandon (US7, #17)", () => {
  it("rejects unauthenticated, unknown, and other-account requests", async () => {
    const owner = await signUp("owner@school.edu");
    const other = await signUp("other@school.edu");
    const session = await insertSession(owner.id);

    const missing = await postAbandon(undefined, session.id);
    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });

    const unknown = await postAbandon(owner.token, "no-such-session");
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toEqual({
      error: {
        code: "SESSION_NOT_FOUND",
        message: "No session exists with that id.",
      },
    });

    const forbidden = await postAbandon(other.token, session.id);
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({
      error: {
        code: "FORBIDDEN",
        message: "That session belongs to another account.",
      },
    });

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
  });

  it("abandons before the scheduled end with zero rewards and keeps earlier rewards", async () => {
    const user = await signUp("owner@school.edu");
    await seedEarlierRewards(user.id);
    const session = await insertSession(user.id);

    const response = await postAbandon(user.token, session.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      id: session.id,
      status: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    expect(body).not.toHaveProperty("pet");
    expect(JSON.stringify(body)).not.toMatch(/token/i);
    await expect(balances(user.id)).resolves.toEqual({
      coins: EARLIER_COINS,
      ...EARLIER_FEEDING,
    });
  });

  it("ends the session for every tab: a later heartbeat cannot revive it", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertSession(user.id);
    await postAbandon(user.token, session.id);

    const response = await postHeartbeat(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: session.id,
      status: "ABANDONED",
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.lastHeartbeatAt.toISOString()).toBe(
      SIX_MINUTES_IN.toISOString(),
    );
  });

  it("completes instead when the scheduled end passed and presence was met", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertSession(user.id, {
      lastHeartbeatAt: new Date(END.getTime() - 10 * MS_PER_SECOND),
    });
    vi.setSystemTime(new Date(END.getTime() + 5 * MS_PER_SECOND));

    const response = await postAbandon(user.token, session.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
    expect(body.pet).toEqual({
      name: "Mochi",
      feedingState: "HUNGRY",
      apples: 1,
      feedingMinutes: 25,
      minutesUntilNextApple: 25,
    });
    await expect(balances(user.id)).resolves.toEqual({
      coins: 25,
      feedingMinutes: 25,
      apples: 1,
    });
  });

  it("abandons after the scheduled end when presence lapsed at or before the end", async () => {
    const user = await signUp("owner@school.edu");
    await seedEarlierRewards(user.id);
    const session = await insertSession(user.id, {
      lastHeartbeatAt: new Date(END.getTime() - GRACE_MS),
    });
    vi.setSystemTime(new Date(END.getTime() + MS_PER_MINUTE));

    const response = await postAbandon(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    await expect(balances(user.id)).resolves.toEqual({
      coins: EARLIER_COINS,
      ...EARLIER_FEEDING,
    });
  });

  it("returns the stored outcome on a retry and never pays rewards twice", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertSession(user.id, {
      lastHeartbeatAt: new Date(END.getTime() - 10 * MS_PER_SECOND),
    });
    vi.setSystemTime(new Date(END.getTime() + 5 * MS_PER_SECOND));
    await postAbandon(user.token, session.id);

    const retry = await postAbandon(user.token, session.id);

    expect(retry.status).toBe(200);
    await expect(retry.json()).resolves.toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
    });
    await expect(balances(user.id)).resolves.toEqual({
      coins: 25,
      feedingMinutes: 25,
      apples: 1,
    });
  });

  it("returns the stored Abandoned outcome when another tab already gave up", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertSession(user.id, {
      status: "ABANDONED",
    });

    const response = await postAbandon(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ABANDONED",
      coinsEarned: 0,
    });
  });

  it("gives one outcome when two tabs give up at the same time", async () => {
    const user = await signUp("owner@school.edu");
    await seedEarlierRewards(user.id);
    const session = await insertSession(user.id);

    const responses = await Promise.all([
      postAbandon(user.token, session.id),
      postAbandon(user.token, session.id),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: "ABANDONED",
        coinsEarned: 0,
      });
    }
    await expect(balances(user.id)).resolves.toEqual({
      coins: EARLIER_COINS,
      ...EARLIER_FEEDING,
    });
  });
});
