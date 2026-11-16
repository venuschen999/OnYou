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
import { POST as abandon } from "@/app/api/sessions/[id]/abandon/route";
import { POST as complete } from "@/app/api/sessions/[id]/complete/route";
import { getFeedingDay } from "@/lib/domain/feedingDay";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

// #21: feeding credit goes to the feeding day of the scheduled end in the
// account's timezone, whichever route resolves the session and however late
// (PRD v2.9 §6 "Day assignment").
const TIMEZONE = "America/New_York"; // EST, UTC-5, in mid-November
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MINUTES = 25;

function authTokenFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`).exec(header);
  return match?.[1] ?? "";
}

async function signUp(email: string): Promise<{ id: string; token: string }> {
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
  return { id: body.user.id, token: authTokenFrom(response) };
}

type SessionRoute = typeof complete;

function postSessionRoute(
  route: SessionRoute,
  action: string,
  token: string,
  sessionId: string,
): Promise<Response> {
  return route(
    new Request(`http://localhost/api/sessions/${sessionId}/${action}`, {
      method: "POST",
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    }),
    { params: Promise.resolve({ id: sessionId }) },
  );
}

function postLogout(token: string): Promise<Response> {
  return logout(
    new Request("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
    }),
  );
}

// A session that met presence: the last heartbeat is 10 seconds before the end.
async function insertSessionEndingAt(userId: string, endTime: Date) {
  return testPrisma.focusSession.create({
    data: buildSession(userId, {
      durationMinutes: DURATION_MINUTES,
      startTime: new Date(endTime.getTime() - DURATION_MINUTES * MS_PER_MINUTE),
      endTime,
      lastHeartbeatAt: new Date(endTime.getTime() - 10 * MS_PER_SECOND),
    }),
  });
}

async function feedingByDay(
  userId: string,
): Promise<Record<string, { feedingMinutes: number; apples: number }>> {
  const pet = await testPrisma.pet.findUniqueOrThrow({ where: { userId } });
  const rows = await testPrisma.dailyFeeding.findMany({
    where: { petId: pet.id },
  });
  return Object.fromEntries(
    rows.map((row) => [
      row.feedingDay.toISOString().slice(0, 10),
      { feedingMinutes: row.feedingMinutes, apples: row.apples },
    ]),
  );
}

beforeEach(async () => {
  await resetTestDatabase();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("feeding day credit (US4, US6, #21)", () => {
  it("credits a session ending just before midnight to that day", async () => {
    const user = await signUp("late-night@school.edu");
    // 23:59:59.999 on Nov 15 in New York.
    const endTime = new Date("2026-11-16T04:59:59.999Z");
    expect(getFeedingDay(endTime, TIMEZONE)).toBe("2026-11-15");
    const session = await insertSessionEndingAt(user.id, endTime);
    vi.setSystemTime(new Date(endTime.getTime() + 1));

    const response = await postSessionRoute(
      complete,
      "complete",
      user.token,
      session.id,
    );

    expect(response.status).toBe(200);
    await expect(feedingByDay(user.id)).resolves.toEqual({
      "2026-11-15": { feedingMinutes: 25, apples: 1 },
    });
  });

  it("credits a session that crosses midnight to the day it ends, not the day it started", async () => {
    const user = await signUp("crossing@school.edu");
    // 23:50 Nov 15 to 00:15 Nov 16 in New York.
    const endTime = new Date("2026-11-16T05:15:00.000Z");
    const session = await insertSessionEndingAt(user.id, endTime);
    expect(getFeedingDay(session.startTime, TIMEZONE)).toBe("2026-11-15");
    vi.setSystemTime(endTime);

    await postSessionRoute(complete, "complete", user.token, session.id);

    await expect(feedingByDay(user.id)).resolves.toEqual({
      "2026-11-16": { feedingMinutes: 25, apples: 1 },
    });
  });

  it("credits the end's day when Give up completes the session the next morning", async () => {
    const user = await signUp("give-up-late@school.edu");
    const endTime = new Date("2026-11-16T04:30:00.000Z"); // 23:30 Nov 15
    const session = await insertSessionEndingAt(user.id, endTime);
    vi.setSystemTime(new Date("2026-11-16T14:00:00.000Z")); // 09:00 Nov 16

    const response = await postSessionRoute(
      abandon,
      "abandon",
      user.token,
      session.id,
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "COMPLETED",
      feedingMinutesEarned: 25,
    });
    await expect(feedingByDay(user.id)).resolves.toEqual({
      "2026-11-15": { feedingMinutes: 25, apples: 1 },
    });
  });

  it("credits the end's day when logout completes the session the next morning", async () => {
    const user = await signUp("logout-late@school.edu");
    const endTime = new Date("2026-11-16T04:30:00.000Z"); // 23:30 Nov 15
    const session = await insertSessionEndingAt(user.id, endTime);
    vi.setSystemTime(new Date("2026-11-16T14:00:00.000Z")); // 09:00 Nov 16

    const response = await postLogout(user.token);

    expect(response.status).toBe(200);
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("COMPLETED");
    await expect(feedingByDay(user.id)).resolves.toEqual({
      "2026-11-15": { feedingMinutes: 25, apples: 1 },
    });
  });

  it("applies the end day's cap and never spills a late session into today", async () => {
    const user = await signUp("full-yesterday@school.edu");
    const pet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    await testPrisma.dailyFeeding.create({
      data: {
        petId: pet.id,
        feedingDay: new Date("2026-11-15T00:00:00.000Z"),
        feedingMinutes: 50,
        apples: 2,
      },
    });
    const endTime = new Date("2026-11-16T04:30:00.000Z"); // 23:30 Nov 15
    const session = await insertSessionEndingAt(user.id, endTime);
    vi.setSystemTime(new Date("2026-11-16T14:00:00.000Z")); // 09:00 Nov 16

    const response = await postSessionRoute(
      complete,
      "complete",
      user.token,
      session.id,
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    await expect(feedingByDay(user.id)).resolves.toEqual({
      "2026-11-15": { feedingMinutes: 50, apples: 2 },
    });
    const saved = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(saved.coins).toBe(25);
  });
});
