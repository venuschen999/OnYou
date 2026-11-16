import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { POST as heartbeat } from "@/app/api/sessions/[id]/heartbeat/route";
import { getFeedingDay } from "@/lib/domain/feedingDay";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const TIMEZONE = "America/New_York";
const NOW = new Date("2026-11-15T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MINUTES = 25;
const END = new Date(NOW.getTime() + DURATION_MINUTES * MS_PER_MINUTE);
const SIX_MINUTES_IN = new Date(NOW.getTime() + 6 * MS_PER_MINUTE);
const EARLIER_COINS = 30;
const EARLIER_FEEDING = { feedingMinutes: 30, apples: 1 };

function authTokenFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(header);
  return match?.[1] ?? "";
}

async function signUp(email: string): Promise<{ id: string; cookie: string }> {
  const response = await signup(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: "sunflower22",
        timezone: TIMEZONE,
      }),
    }),
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as { user: { id: string } };
  return { id: body.user.id, cookie: authTokenFrom(response) };
}

function postLogout(cookie?: string): Promise<Response> {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${AUTH_COOKIE_NAME}=${cookie}`);
  return logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers,
    }),
  );
}

function postHeartbeat(cookie: string, sessionId: string): Promise<Response> {
  return heartbeat(
    new Request(`http://localhost/api/sessions/${sessionId}/heartbeat`, {
      method: "POST",
      headers: { cookie: `${AUTH_COOKIE_NAME}=${cookie}` },
    }),
    { params: Promise.resolve({ id: sessionId }) },
  );
}

async function insertActive(
  userId: string,
  overrides: Parameters<typeof buildSession>[1] = {},
) {
  return testPrisma.focusSession.create({
    data: buildSession(userId, {
      durationMinutes: DURATION_MINUTES,
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

function expectCookieCleared(response: Response): void {
  expect(response.headers.get("set-cookie")).toMatch(
    new RegExp(`${AUTH_COOKIE_NAME}=;.*Max-Age=0`, "i"),
  );
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

describe("POST /api/auth/logout (US1, #18)", () => {
  it("requires authentication", async () => {
    const response = await postLogout();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
  });

  it("logs out with no Active session by clearing this browser's cookie", async () => {
    const user = await signUp("owner@school.edu");

    const response = await postLogout(user.cookie);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Logged out." });
    expectCookieCleared(response);
    await expect(testPrisma.focusSession.count()).resolves.toBe(0);
  });

  it("abandons the Active session with zero rewards and keeps earlier rewards", async () => {
    const user = await signUp("owner@school.edu");
    await seedEarlierRewards(user.id);
    const session = await insertActive(user.id);

    const response = await postLogout(user.cookie);

    expect(response.status).toBe(200);
    expectCookieCleared(response);
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored).toMatchObject({
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

  it("ends the session for every tab: another tab's heartbeat sees it Abandoned", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertActive(user.id);
    await postLogout(user.cookie);

    // Another device still holds a valid cookie (A17 signs out this browser only).
    const response = await postHeartbeat(user.cookie, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: session.id,
      status: "ABANDONED",
    });
  });

  it("completes instead when the scheduled end passed and presence was met", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertActive(user.id, {
      lastHeartbeatAt: new Date(END.getTime() - 10 * MS_PER_SECOND),
    });
    vi.setSystemTime(new Date(END.getTime() + 5 * MS_PER_SECOND));

    const response = await postLogout(user.cookie);

    expect(response.status).toBe(200);
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored).toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
    await expect(balances(user.id)).resolves.toEqual({
      coins: 25,
      feedingMinutes: 25,
      apples: 1,
    });
  });

  it("leaves another account's Active session untouched", async () => {
    const owner = await signUp("owner@school.edu");
    const other = await signUp("other@school.edu");
    const othersSession = await insertActive(other.id);

    await postLogout(owner.cookie);

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: othersSession.id },
    });
    expect(stored.status).toBe("ACTIVE");
  });
});
