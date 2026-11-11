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
import { POST as complete } from "@/app/api/sessions/[id]/complete/route";
import { PRESENCE_GRACE_SECONDS } from "@/lib/domain/presence";
import {
  FeedingState,
  getFeedingState,
  type FeedingState as FeedingStateName,
} from "@/lib/domain/rewards";
import { getFeedingDay } from "@/lib/domain/feedingDay";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { completeSession } from "@/lib/server/sessionService";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const PASSWORD = "sunflower22";
const TIMEZONE = "America/New_York";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MINUTES = 25;
const END = new Date(NOW.getTime() + DURATION_MINUTES * MS_PER_MINUTE);
const GRACE_MS = PRESENCE_GRACE_SECONDS * MS_PER_SECOND;
const NOT_FOUND_MESSAGE = "No session exists with that id.";
const FORBIDDEN_MESSAGE = "That session belongs to another account.";
const TOO_EARLY_MESSAGE = "This session has not reached its scheduled end.";
const ABANDONED_MESSAGE = "This session was abandoned and cannot be completed.";
const SESSION_KEYS = [
  "applesEarned",
  "coinsEarned",
  "durationMinutes",
  "endTime",
  "feedingMinutesEarned",
  "id",
  "lastHeartbeatAt",
  "startTime",
  "status",
  "taskName",
];

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

function completeRequest(
  token: string | undefined,
  sessionId: string,
  body?: unknown,
): Request {
  const headers = new Headers();
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(`http://localhost/api/sessions/${sessionId}/complete`, {
    method: "POST",
    headers,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}

function postComplete(
  token: string | undefined,
  sessionId: string,
  body?: unknown,
): Promise<Response> {
  return complete(completeRequest(token, sessionId, body), {
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
      lastHeartbeatAt: new Date(END.getTime() - 10 * MS_PER_SECOND),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
      ...overrides,
    }),
  });
}

function feedingDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

async function petAndFeeding(userId: string) {
  const pet = await testPrisma.pet.findUniqueOrThrow({ where: { userId } });
  const feedings = await testPrisma.dailyFeeding.findMany({
    where: { petId: pet.id },
    orderBy: { feedingDay: "asc" },
  });
  return { pet, feedings };
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

describe("POST /api/sessions/{id}/complete (US6, #15)", () => {
  it("requires authentication and returns the completed session", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertSession(user.id);
    vi.setSystemTime(END);

    const missing = await postComplete(undefined, session.id);
    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });

    const response = await postComplete(user.token, session.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-session-token")).toBeNull();
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(SESSION_KEYS);
    expect(body).toMatchObject({
      id: session.id,
      taskName: "Essay draft: intro",
      durationMinutes: DURATION_MINUTES,
      status: "COMPLETED",
      startTime: NOW.toISOString(),
      endTime: END.toISOString(),
      lastHeartbeatAt: new Date(
        END.getTime() - 10 * MS_PER_SECOND,
      ).toISOString(),
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
    expect(JSON.stringify(body)).not.toMatch(/token/i);

    const { pet, feedings } = await petAndFeeding(user.id);
    expect(pet.coins).toBe(25);
    expect(feedings).toHaveLength(1);
    expect(feedings[0]).toMatchObject({ feedingMinutes: 25, apples: 1 });
    expect(feedings[0]?.feedingDay.toISOString().startsWith("2026-11-09")).toBe(
      true,
    );
    expect(getFeedingState(feedings[0]?.apples ?? 0)).toBe(FeedingState.HUNGRY);
  });

  it("rejects a stale token and leaves the active session unchanged", async () => {
    const user = await signUp("stale-auth@school.edu");
    const session = await insertSession(user.id);
    await testPrisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: 1 },
    });
    vi.setSystemTime(END);

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(401);
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.coinsEarned).toBe(0);
  });

  it("rejects another account with 403 and does not complete or abandon", async () => {
    const owner = await signUp("owner-forbid@school.edu");
    const other = await signUp("other@school.edu");
    const session = await insertSession(owner.id, {
      lastHeartbeatAt: NOW,
    });
    vi.setSystemTime(new Date(NOW.getTime() + GRACE_MS));

    const response = await postComplete(other.token, session.id);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "FORBIDDEN", message: FORBIDDEN_MESSAGE },
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.userId).toBe(owner.id);
    expect(stored.coinsEarned).toBe(0);
    const ownerPet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: owner.id },
    });
    expect(ownerPet.coins).toBe(0);
  });

  it("returns 404 when the session id does not exist", async () => {
    const user = await signUp("missing@school.edu");

    const response = await postComplete(user.token, "missing-session-id");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SESSION_NOT_FOUND", message: NOT_FOUND_MESSAGE },
    });
    const hostile = await postComplete(
      user.token,
      '\'; DROP TABLE "FocusSession"; --',
    );
    expect(hostile.status).toBe(404);
    expect(await testPrisma.focusSession.count()).toBe(0);
  });

  it("rejects completion one millisecond before the scheduled end", async () => {
    const user = await signUp("early@school.edu");
    const session = await insertSession(user.id);
    vi.setSystemTime(new Date(END.getTime() - 1));

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SESSION_TOO_EARLY", message: TOO_EARLY_MESSAGE },
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(
      new Date(END.getTime() - 10 * MS_PER_SECOND).toISOString(),
    );
    expect(stored.coinsEarned).toBe(0);
    const { feedings, pet } = await petAndFeeding(user.id);
    expect(pet.coins).toBe(0);
    expect(feedings).toHaveLength(0);
  });

  it("completes at the scheduled end when the deadline is one millisecond later", async () => {
    const user = await signUp("boundary-met@school.edu");
    const lastHeartbeatAt = new Date(END.getTime() - GRACE_MS + 1);
    const session = await insertSession(user.id, { lastHeartbeatAt });
    vi.setSystemTime(END);

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
      lastHeartbeatAt: lastHeartbeatAt.toISOString(),
    });
  });

  it("abandons when the presence deadline is exactly the scheduled end", async () => {
    const user = await signUp("boundary-miss@school.edu");
    await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 40 },
    });
    const lastHeartbeatAt = new Date(END.getTime() - GRACE_MS);
    const session = await insertSession(user.id, { lastHeartbeatAt });
    vi.setSystemTime(END);

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SESSION_ABANDONED", message: ABANDONED_MESSAGE },
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored).toMatchObject({
      status: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    expect(stored.lastHeartbeatAt.toISOString()).toBe(
      lastHeartbeatAt.toISOString(),
    );
    const { pet, feedings } = await petAndFeeding(user.id);
    expect(pet.coins).toBe(40);
    expect(feedings).toHaveLength(0);

    vi.setSystemTime(new Date(END.getTime() + 5 * MS_PER_MINUTE));
    const retry = await postComplete(user.token, session.id);
    expect(retry.status).toBe(409);
    await expect(retry.json()).resolves.toEqual({
      error: { code: "SESSION_ABANDONED", message: ABANDONED_MESSAGE },
    });
    const afterRetry = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(afterRetry.status).toBe("ABANDONED");
  });

  it("abandons a gap of 30 seconds before the end instead of completing early", async () => {
    const user = await signUp("gap@school.edu");
    const session = await insertSession(user.id, { lastHeartbeatAt: NOW });
    vi.setSystemTime(new Date(NOW.getTime() + GRACE_MS));

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SESSION_ABANDONED" },
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ABANDONED");
    expect(stored.coinsEarned).toBe(0);
  });

  it("ignores client reward amounts, including invalid JSON", async () => {
    const user = await signUp("client-body@school.edu");
    const session = await insertSession(user.id);
    vi.setSystemTime(END);

    const response = await postComplete(user.token, session.id, {
      coinsEarned: 9999,
      feedingMinutesEarned: 50,
      applesEarned: 2,
      status: "COMPLETED",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });

    const secondUser = await signUp("invalid-json@school.edu");
    const second = await insertSession(secondUser.id, {
      endTime: new Date(END.getTime() + 60 * MS_PER_MINUTE),
      startTime: new Date(END.getTime() + 35 * MS_PER_MINUTE),
      lastHeartbeatAt: new Date(
        END.getTime() + 60 * MS_PER_MINUTE - 10 * MS_PER_SECOND,
      ),
    });
    vi.setSystemTime(new Date(END.getTime() + 60 * MS_PER_MINUTE));
    const broken = await postComplete(secondUser.token, second.id, "{");
    expect(broken.status).toBe(200);
    await expect(broken.json()).resolves.toMatchObject({
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
  });

  it("returns the stored outcome on retry and does not award again", async () => {
    const user = await signUp("retry@school.edu");
    const session = await insertSession(user.id);
    vi.setSystemTime(END);

    const first = await postComplete(user.token, session.id);
    const firstBody = await first.json();
    await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 1000 },
    });
    const pet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    await testPrisma.dailyFeeding.update({
      where: {
        petId_feedingDay: {
          petId: pet.id,
          feedingDay: feedingDate("2026-11-09"),
        },
      },
      data: { feedingMinutes: 50, apples: 2 },
    });

    const second = await postComplete(user.token, session.id, {
      coinsEarned: 1,
    });

    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual(firstBody);
    const savedPet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(savedPet.coins).toBe(1000);
    const feeding = await testPrisma.dailyFeeding.findUniqueOrThrow({
      where: {
        petId_feedingDay: {
          petId: pet.id,
          feedingDay: feedingDate("2026-11-09"),
        },
      },
    });
    expect(feeding).toMatchObject({ feedingMinutes: 50, apples: 2 });
  });

  it("awards a 25-minute session once when two completions race", async () => {
    const user = await signUp("race@school.edu");
    const session = await insertSession(user.id);

    const [first, second] = await Promise.all([
      completeSession(user.id, session.id, END),
      completeSession(user.id, session.id, END),
    ]);

    expect([first, second]).toEqual([
      expect.objectContaining({
        status: "COMPLETED",
        coinsEarned: 25,
        feedingMinutesEarned: 25,
        applesEarned: 1,
      }),
      expect.objectContaining({
        status: "COMPLETED",
        coinsEarned: 25,
        feedingMinutesEarned: 25,
        applesEarned: 1,
      }),
    ]);
    const { pet, feedings } = await petAndFeeding(user.id);
    expect(pet.coins).toBe(25);
    expect(feedings).toEqual([
      expect.objectContaining({ feedingMinutes: 25, apples: 1 }),
    ]);
  });

  it("does not leave a completed session when the feeding write fails", async () => {
    const user = await signUp("rollback@school.edu");
    await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 7 },
    });
    const session = await insertSession(user.id);
    vi.setSystemTime(END);
    await testPrisma.$executeRawUnsafe(
      'ALTER TABLE "DailyFeeding" DROP CONSTRAINT IF EXISTS "onyou_test_apples_fail"',
    );
    await testPrisma.$executeRawUnsafe(
      'ALTER TABLE "DailyFeeding" ADD CONSTRAINT "onyou_test_apples_fail" CHECK ("apples" < 0)',
    );

    try {
      const response = await postComplete(user.token, session.id);
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong. Try again.",
        },
      });
      const stored = await testPrisma.focusSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      expect(stored.status).toBe("ACTIVE");
      expect(stored.coinsEarned).toBe(0);
      expect(stored.feedingMinutesEarned).toBe(0);
      expect(stored.applesEarned).toBe(0);
      const { pet, feedings } = await petAndFeeding(user.id);
      expect(pet.coins).toBe(7);
      expect(feedings).toHaveLength(0);
    } finally {
      await testPrisma.$executeRawUnsafe(
        'ALTER TABLE "DailyFeeding" DROP CONSTRAINT IF EXISTS "onyou_test_apples_fail"',
      );
    }
  });

  it("discards minutes past the daily cap and keeps the earned coins", async () => {
    const user = await signUp("cap@school.edu");
    const pet = await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 30 },
    });
    const day = getFeedingDay(END, TIMEZONE);
    expect(day).toBe("2026-11-09");
    await testPrisma.dailyFeeding.create({
      data: {
        petId: pet.id,
        feedingDay: feedingDate(day),
        feedingMinutes: 40,
        apples: 1,
      },
    });
    const session = await insertSession(user.id);
    vi.setSystemTime(END);

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      coinsEarned: 25,
      feedingMinutesEarned: 10,
      applesEarned: 1,
    });
    const saved = await petAndFeeding(user.id);
    expect(saved.pet.coins).toBe(55);
    expect(saved.feedings).toHaveLength(1);
    expect(saved.feedings[0]).toMatchObject({
      feedingMinutes: 50,
      apples: 2,
    });
    expect(getFeedingState(saved.feedings[0]?.apples ?? 0)).toBe(
      FeedingState.FULL,
    );
  });

  it("keeps earning coins when the pet is already Full", async () => {
    const user = await signUp("full@school.edu");
    const pet = await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 55 },
    });
    await testPrisma.dailyFeeding.create({
      data: {
        petId: pet.id,
        feedingDay: feedingDate("2026-11-09"),
        feedingMinutes: 50,
        apples: 2,
      },
    });
    const session = await insertSession(user.id, {
      durationMinutes: 15,
      startTime: new Date(END.getTime() - 15 * MS_PER_MINUTE),
    });
    vi.setSystemTime(END);

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      durationMinutes: 15,
      status: "COMPLETED",
      coinsEarned: 15,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    const saved = await petAndFeeding(user.id);
    expect(saved.pet.coins).toBe(70);
    expect(saved.feedings[0]).toMatchObject({
      feedingMinutes: 50,
      apples: 2,
    });
    expect(getFeedingState(2)).toBe(FeedingState.FULL);
  });

  it("follows the feeding-day sequence for two short sessions and one capped session", async () => {
    const user = await signUp("sequence@school.edu");
    const steps: Array<{
      duration: 15 | 25;
      end: string;
      coins: number;
      minutes: number;
      apples: number;
      earnedMinutes: number;
      earnedApples: number;
      state: FeedingStateName;
    }> = [
      {
        duration: 15,
        end: "2026-11-09T15:15:00.000Z",
        coins: 15,
        minutes: 15,
        apples: 0,
        earnedMinutes: 15,
        earnedApples: 0,
        state: FeedingState.STARVING,
      },
      {
        duration: 15,
        end: "2026-11-09T16:15:00.000Z",
        coins: 30,
        minutes: 30,
        apples: 1,
        earnedMinutes: 15,
        earnedApples: 1,
        state: FeedingState.HUNGRY,
      },
      {
        duration: 25,
        end: "2026-11-09T18:00:00.000Z",
        coins: 55,
        minutes: 50,
        apples: 2,
        earnedMinutes: 20,
        earnedApples: 1,
        state: FeedingState.FULL,
      },
    ];

    for (const step of steps) {
      const endTime = new Date(step.end);
      const session = await insertSession(user.id, {
        durationMinutes: step.duration,
        taskName: `${step.duration} minute focus`,
        startTime: new Date(endTime.getTime() - step.duration * MS_PER_MINUTE),
        endTime,
        lastHeartbeatAt: new Date(endTime.getTime() - 10 * MS_PER_SECOND),
      });
      vi.setSystemTime(endTime);
      const response = await postComplete(user.token, session.id);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: "COMPLETED",
        coinsEarned: step.duration,
        feedingMinutesEarned: step.earnedMinutes,
        applesEarned: step.earnedApples,
      });
      const saved = await petAndFeeding(user.id);
      expect(saved.pet.coins).toBe(step.coins);
      expect(saved.feedings).toHaveLength(1);
      expect(saved.feedings[0]).toMatchObject({
        feedingMinutes: step.minutes,
        apples: step.apples,
      });
      expect(getFeedingState(saved.feedings[0]?.apples ?? 0)).toBe(step.state);
    }

    await testPrisma.focusSession.create({
      data: buildSession(user.id, {
        status: "ABANDONED",
        taskName: "Given up",
        durationMinutes: 25,
        coinsEarned: 0,
        feedingMinutesEarned: 0,
        applesEarned: 0,
      }),
    });
    const afterGiveUp = await petAndFeeding(user.id);
    expect(afterGiveUp.pet.coins).toBe(55);
    expect(afterGiveUp.feedings[0]).toMatchObject({
      feedingMinutes: 50,
      apples: 2,
    });
  });

  it("credits the scheduled end's feeding day when completion is resolved later", async () => {
    const user = await signUp("late-day@school.edu");
    const pet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const endTime = new Date("2026-11-04T04:59:00.000Z");
    expect(getFeedingDay(endTime, TIMEZONE)).toBe("2026-11-03");
    await testPrisma.dailyFeeding.create({
      data: {
        petId: pet.id,
        feedingDay: feedingDate("2026-11-04"),
        feedingMinutes: 10,
        apples: 0,
      },
    });
    const session = await insertSession(user.id, {
      durationMinutes: 15,
      startTime: new Date(endTime.getTime() - 15 * MS_PER_MINUTE),
      endTime,
      lastHeartbeatAt: new Date(endTime.getTime() - 10 * MS_PER_SECOND),
    });
    vi.setSystemTime(new Date("2026-11-04T15:00:00.000Z"));

    const response = await postComplete(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      coinsEarned: 15,
      feedingMinutesEarned: 15,
      applesEarned: 0,
    });
    const saved = await petAndFeeding(user.id);
    expect(saved.pet.coins).toBe(15);
    expect(saved.feedings).toHaveLength(2);
    const byDay = Object.fromEntries(
      saved.feedings.map((row) => [
        row.feedingDay.toISOString().slice(0, 10),
        row,
      ]),
    );
    expect(byDay["2026-11-03"]).toMatchObject({
      feedingMinutes: 15,
      apples: 0,
    });
    expect(byDay["2026-11-04"]).toMatchObject({
      feedingMinutes: 10,
      apples: 0,
    });
    expect(getFeedingState(0)).toBe(FeedingState.STARVING);
  });

  it("keeps stored session rewards equal to the pet and feeding deltas", async () => {
    const user = await signUp("consistent@school.edu");
    const pet = await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 11 },
    });
    await testPrisma.dailyFeeding.create({
      data: {
        petId: pet.id,
        feedingDay: feedingDate("2026-11-09"),
        feedingMinutes: 15,
        apples: 0,
      },
    });
    const session = await insertSession(user.id, { durationMinutes: 15 });
    vi.setSystemTime(END);

    const response = await postComplete(user.token, session.id);
    const body = (await response.json()) as {
      coinsEarned: number;
      feedingMinutesEarned: number;
      applesEarned: number;
    };
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    const saved = await petAndFeeding(user.id);

    expect(stored.coinsEarned).toBe(body.coinsEarned);
    expect(stored.feedingMinutesEarned).toBe(body.feedingMinutesEarned);
    expect(stored.applesEarned).toBe(body.applesEarned);
    expect(saved.pet.coins - 11).toBe(stored.coinsEarned);
    expect((saved.feedings[0]?.feedingMinutes ?? 0) - 15).toBe(
      stored.feedingMinutesEarned,
    );
    expect((saved.feedings[0]?.apples ?? 0) - 0).toBe(stored.applesEarned);
    expect(stored).toMatchObject({
      coinsEarned: 15,
      feedingMinutesEarned: 15,
      applesEarned: 1,
    });
  });
});
