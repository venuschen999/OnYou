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
import { POST as startSession } from "@/app/api/sessions/route";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/server/authToken";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const PASSWORD = "sunflower22";
const TIMEZONE = "America/New_York";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MESSAGE = "Choose 15, 25, or 50 minutes.";
const ACTIVE_SESSION_MESSAGE = "One session at a time";
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

function startRequest(token: string | undefined, body: unknown): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
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

function endTimeFor(durationMinutes: number): string {
  return new Date(
    NOW.getTime() + durationMinutes * MS_PER_MINUTE,
  ).toISOString();
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

describe("POST /api/sessions (US5, #12)", () => {
  it("creates an account-owned session and records the first heartbeat", async () => {
    const user = await signUp("jo@school.edu");

    const response = await startSession(
      startRequest(user.token, {
        taskName: "  Essay draft: intro  ",
        durationMinutes: 25,
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toBeNull();
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(SESSION_KEYS);
    expect(body).toEqual({
      id: expect.any(String),
      taskName: "Essay draft: intro",
      durationMinutes: 25,
      status: "ACTIVE",
      startTime: NOW.toISOString(),
      endTime: endTimeFor(25),
      lastHeartbeatAt: NOW.toISOString(),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    expect(JSON.stringify(body)).not.toMatch(/token/i);

    const stored = await testPrisma.focusSession.findFirstOrThrow();
    expect(stored.userId).toBe(user.id);
    expect(stored.taskName).toBe("Essay draft: intro");
    expect(stored.startTime.toISOString()).toBe(NOW.toISOString());
    expect(stored.endTime.toISOString()).toBe(endTimeFor(25));
    expect(stored.lastHeartbeatAt.toISOString()).toBe(NOW.toISOString());
    expect(stored.coinsEarned).toBe(0);
  });

  it.each([15, 50])(
    "sets endTime from the server clock for %i minutes",
    async (durationMinutes) => {
      const user = await signUp(`dur${durationMinutes}@school.edu`);
      const response = await startSession(
        startRequest(user.token, { durationMinutes }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.taskName).toBe("Focus session");
      expect(body.endTime).toBe(endTimeFor(durationMinutes));
    },
  );

  it("stores Focus session when the task is blank", async () => {
    const user = await signUp("blank@school.edu");
    const response = await startSession(
      startRequest(user.token, { taskName: "   ", durationMinutes: 25 }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.taskName).toBe("Focus session");
  });

  it("rejects a task over 80 characters and writes no row", async () => {
    const user = await signUp("long@school.edu");
    const response = await startSession(
      startRequest(user.token, {
        taskName: "a".repeat(81),
        durationMinutes: 25,
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: {
        taskName: "Task names can be up to 80 characters. This one has 81.",
      },
    });
    await expect(testPrisma.focusSession.count()).resolves.toBe(0);
  });

  it("rejects a duration other than 15, 25, or 50 and writes no row", async () => {
    const user = await signUp("duration@school.edu");
    const response = await startSession(
      startRequest(user.token, { durationMinutes: 20 }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { durationMinutes: DURATION_MESSAGE },
    });
    await expect(testPrisma.focusSession.count()).resolves.toBe(0);
  });

  it("rejects a body that is not JSON", async () => {
    const user = await signUp("json@school.edu");
    const response = await startSession(startRequest(user.token, "{not json"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    await expect(testPrisma.focusSession.count()).resolves.toBe(0);
  });

  it("rejects a missing cookie with 401 and writes no row", async () => {
    const response = await startSession(
      startRequest(undefined, { durationMinutes: 25 }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
    await expect(testPrisma.focusSession.count()).resolves.toBe(0);
  });

  it("rejects a token whose tokenVersion is stale", async () => {
    const user = await signUp("stale-auth@school.edu");
    await testPrisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: 1 },
    });

    const response = await startSession(
      startRequest(user.token, { durationMinutes: 25 }),
    );

    expect(response.status).toBe(401);
    expect(await verifyAuthToken(user.token, NOW)).toMatchObject({
      tokenVersion: 0,
    });
    await expect(testPrisma.focusSession.count()).resolves.toBe(0);
  });

  it("rejects a second active session with 409 and leaves the first unchanged", async () => {
    const user = await signUp("twice@school.edu");
    const first = await startSession(
      startRequest(user.token, {
        taskName: "Essay draft: intro",
        durationMinutes: 25,
      }),
    );
    const firstBody = await first.json();

    const second = await startSession(
      startRequest(user.token, {
        taskName: "Another task",
        durationMinutes: 50,
      }),
    );

    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toEqual({
      error: {
        code: "ACTIVE_SESSION_EXISTS",
        message: ACTIVE_SESSION_MESSAGE,
      },
    });
    const stored = await testPrisma.focusSession.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: firstBody.id,
      taskName: "Essay draft: intro",
      durationMinutes: 25,
      status: "ACTIVE",
    });
  });

  it("allows one active session per account when two starts race", async () => {
    const user = await signUp("race@school.edu");
    const responses = await Promise.all([
      startSession(startRequest(user.token, { durationMinutes: 25 })),
      startSession(startRequest(user.token, { durationMinutes: 15 })),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    await expect(
      testPrisma.focusSession.count({ where: { status: "ACTIVE" } }),
    ).resolves.toBe(1);
  });

  it.each(["COMPLETED", "ABANDONED"] as const)(
    "starts a session when the previous one is %s",
    async (status) => {
      const user = await signUp(`${status.toLowerCase()}@school.edu`);
      await testPrisma.focusSession.create({
        data: buildSession(user.id, { status }),
      });

      const response = await startSession(
        startRequest(user.token, { durationMinutes: 15 }),
      );

      expect(response.status).toBe(201);
      await expect(
        testPrisma.focusSession.count({ where: { status: "ACTIVE" } }),
      ).resolves.toBe(1);
    },
  );

  it("lets a different account start while this account has an active session", async () => {
    const first = await signUp("first@school.edu");
    const second = await signUp("second@school.edu");
    const firstResponse = await startSession(
      startRequest(first.token, { durationMinutes: 25 }),
    );
    expect(firstResponse.status).toBe(201);

    const secondResponse = await startSession(
      startRequest(second.token, {
        taskName: "Problem set",
        durationMinutes: 50,
      }),
    );

    expect(secondResponse.status).toBe(201);
    const sessions = await testPrisma.focusSession.findMany({
      orderBy: { taskName: "asc" },
    });
    expect(sessions.map((session) => session.userId).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    expect(sessions.every((session) => session.status === "ACTIVE")).toBe(true);
  });

  it("abandons a stale active session with zero rewards, then starts a new one", async () => {
    const user = await signUp("stale@school.edu");
    const pet = await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 40 },
    });
    await testPrisma.dailyFeeding.create({
      data: {
        petId: pet.id,
        feedingDay: new Date("2026-11-09"),
        feedingMinutes: 30,
        apples: 1,
      },
    });
    await testPrisma.focusSession.create({
      data: buildSession(user.id, {
        status: "COMPLETED",
        taskName: "Earlier work",
        coinsEarned: 15,
        feedingMinutesEarned: 15,
        applesEarned: 0,
      }),
    });
    await testPrisma.focusSession.create({
      data: buildSession(user.id, {
        status: "ACTIVE",
        taskName: "Stale session",
        startTime: new Date(NOW.getTime() - 2 * MS_PER_MINUTE),
        endTime: new Date(NOW.getTime() + 25 * MS_PER_MINUTE),
        lastHeartbeatAt: new Date(NOW.getTime() - 30 * MS_PER_SECOND),
        coinsEarned: 7,
        feedingMinutesEarned: 7,
        applesEarned: 1,
      }),
    });

    const response = await startSession(
      startRequest(user.token, {
        taskName: "Fresh start",
        durationMinutes: 15,
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      taskName: "Fresh start",
      status: "ACTIVE",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });

    const stale = await testPrisma.focusSession.findFirstOrThrow({
      where: { taskName: "Stale session" },
    });
    expect(stale.status).toBe("ABANDONED");
    expect(stale).toMatchObject({
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    const earlier = await testPrisma.focusSession.findFirstOrThrow({
      where: { taskName: "Earlier work" },
    });
    expect(earlier).toMatchObject({
      status: "COMPLETED",
      coinsEarned: 15,
      feedingMinutesEarned: 15,
      applesEarned: 0,
    });
    const savedPet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(savedPet.coins).toBe(40);
    const feeding = await testPrisma.dailyFeeding.findUniqueOrThrow({
      where: {
        petId_feedingDay: {
          petId: pet.id,
          feedingDay: new Date("2026-11-09"),
        },
      },
    });
    expect(feeding).toMatchObject({ feedingMinutes: 30, apples: 1 });
  });

  it("keeps a session active one millisecond before the presence deadline", async () => {
    const user = await signUp("boundary@school.edu");
    const created = await startSession(
      startRequest(user.token, { durationMinutes: 25 }),
    );
    const createdBody = await created.json();
    await testPrisma.focusSession.update({
      where: { id: createdBody.id },
      data: {
        lastHeartbeatAt: new Date(NOW.getTime() - 30 * MS_PER_SECOND + 1),
      },
    });

    const response = await startSession(
      startRequest(user.token, { durationMinutes: 50 }),
    );

    expect(response.status).toBe(409);
    const stored = await testPrisma.focusSession.findFirstOrThrow();
    expect(stored.status).toBe("ACTIVE");
    expect(stored.id).toBe(createdBody.id);
  });

  it("returns 409 and keeps a presence-met session active past its end", async () => {
    const user = await signUp("met@school.edu");
    await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 40 },
    });
    const endTime = new Date(NOW.getTime() - MS_PER_MINUTE);
    await testPrisma.focusSession.create({
      data: buildSession(user.id, {
        status: "ACTIVE",
        taskName: "Ready to complete",
        startTime: new Date(endTime.getTime() - 25 * MS_PER_MINUTE),
        endTime,
        lastHeartbeatAt: new Date(endTime.getTime() - 10 * MS_PER_SECOND),
        coinsEarned: 0,
        feedingMinutesEarned: 0,
        applesEarned: 0,
      }),
    });

    const response = await startSession(
      startRequest(user.token, { durationMinutes: 25 }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "ACTIVE_SESSION_EXISTS",
        message: ACTIVE_SESSION_MESSAGE,
      },
    });
    const sessions = await testPrisma.focusSession.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      taskName: "Ready to complete",
      status: "ACTIVE",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    const pet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(pet.coins).toBe(40);
  });
});
