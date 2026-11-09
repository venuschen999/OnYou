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
import { POST as heartbeat } from "@/app/api/sessions/[id]/heartbeat/route";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/server/authToken";
import { heartbeatSession } from "@/lib/server/sessionService";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const PASSWORD = "sunflower22";
const TIMEZONE = "America/New_York";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const DURATION_MINUTES = 25;
const END = new Date(NOW.getTime() + DURATION_MINUTES * MS_PER_MINUTE);
const NOT_FOUND_MESSAGE = "No session exists with that id.";
const FORBIDDEN_MESSAGE = "That session belongs to another account.";

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

function postHeartbeat(
  token: string | undefined,
  sessionId: string,
  body?: unknown,
): Promise<Response> {
  return heartbeat(heartbeatRequest(token, sessionId, body), {
    params: Promise.resolve({ id: sessionId }),
  });
}

function heartbeatRequest(
  token: string | undefined,
  sessionId: string,
  body?: unknown,
): Request {
  const headers = new Headers();
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(`http://localhost/api/sessions/${sessionId}/heartbeat`, {
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

describe("POST /api/sessions/{id}/heartbeat (US5, #14)", () => {
  it("requires authentication and returns the authoritative session", async () => {
    const user = await signUp("owner@school.edu");
    const session = await insertSession(user.id);
    vi.setSystemTime(new Date(NOW.getTime() + 10 * MS_PER_SECOND));

    const missing = await postHeartbeat(undefined, session.id);
    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });

    const response = await postHeartbeat(user.token, session.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-session-token")).toBeNull();
    const body = await response.json();
    expect(body).toMatchObject({
      id: session.id,
      taskName: "Essay draft: intro",
      durationMinutes: DURATION_MINUTES,
      status: "ACTIVE",
      startTime: NOW.toISOString(),
      endTime: END.toISOString(),
      lastHeartbeatAt: new Date(
        NOW.getTime() + 10 * MS_PER_SECOND,
      ).toISOString(),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    expect(JSON.stringify(body)).not.toMatch(/token/i);
  });

  it("rejects a token whose tokenVersion is stale and leaves the session unchanged", async () => {
    const user = await signUp("stale-auth@school.edu");
    const session = await insertSession(user.id);
    await testPrisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: 1 },
    });

    const response = await postHeartbeat(user.token, session.id);

    expect(response.status).toBe(401);
    expect(await verifyAuthToken(user.token, NOW)).toMatchObject({
      tokenVersion: 0,
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.lastHeartbeatAt.toISOString()).toBe(NOW.toISOString());
    expect(stored.status).toBe("ACTIVE");
  });

  it("rejects another account with 403 and does not renew or abandon", async () => {
    const owner = await signUp("owner-forbid@school.edu");
    const other = await signUp("other@school.edu");
    const session = await insertSession(owner.id);
    vi.setSystemTime(new Date(NOW.getTime() + 10 * MS_PER_SECOND));

    const response = await postHeartbeat(other.token, session.id);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "FORBIDDEN", message: FORBIDDEN_MESSAGE },
    });
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(NOW.toISOString());
    expect(stored.userId).toBe(owner.id);
  });

  it("returns 404 when the session id does not exist", async () => {
    const user = await signUp("missing@school.edu");

    const response = await postHeartbeat(user.token, "missing-session-id");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SESSION_NOT_FOUND", message: NOT_FOUND_MESSAGE },
    });
  });

  it("ignores client timestamps and reward amounts", async () => {
    const user = await signUp("client-body@school.edu");
    const session = await insertSession(user.id);
    vi.setSystemTime(new Date(NOW.getTime() + 10 * MS_PER_SECOND));

    const response = await postHeartbeat(user.token, session.id, {
      lastHeartbeatAt: "2099-01-01T00:00:00.000Z",
      coinsEarned: 99,
      status: "COMPLETED",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ACTIVE");
    expect(body.coinsEarned).toBe(0);
    expect(body.lastHeartbeatAt).toBe(
      new Date(NOW.getTime() + 10 * MS_PER_SECOND).toISOString(),
    );
  });

  it("renews one millisecond before the deadline", async () => {
    const user = await signUp("boundary@school.edu");
    const session = await insertSession(user.id);
    const now = new Date(NOW.getTime() + 30 * MS_PER_SECOND - 1);
    vi.setSystemTime(now);

    const response = await postHeartbeat(user.token, session.id);

    expect(response.status).toBe(200);
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(now.toISOString());
  });

  it("abandons a gap of 30 seconds before the scheduled end and later heartbeats cannot revive it", async () => {
    const user = await signUp("gap@school.edu");
    const pet = await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 40 },
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
    const session = await insertSession(user.id, {
      coinsEarned: 7,
      feedingMinutesEarned: 7,
      applesEarned: 1,
    });
    const lapse = new Date(NOW.getTime() + 30 * MS_PER_SECOND);
    vi.setSystemTime(lapse);

    const first = await postHeartbeat(user.token, session.id);
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toMatchObject({
      id: session.id,
      status: "ABANDONED",
      lastHeartbeatAt: NOW.toISOString(),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });

    vi.setSystemTime(new Date(lapse.getTime() + 15 * MS_PER_SECOND));
    const second = await postHeartbeat(user.token, session.id);
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body).toMatchObject({
      status: "ABANDONED",
      lastHeartbeatAt: NOW.toISOString(),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ABANDONED");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(NOW.toISOString());
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
      where: { id: pet.id },
    });
    expect(savedPet.coins).toBe(40);
  });

  it("abandons when the deadline is exactly the scheduled end", async () => {
    const user = await signUp("exact-end@school.edu");
    const session = await insertSession(user.id, {
      lastHeartbeatAt: new Date(END.getTime() - 30 * MS_PER_SECOND),
    });
    vi.setSystemTime(END);

    const response = await postHeartbeat(user.token, session.id);

    expect(response.status).toBe(200);
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ABANDONED");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(
      new Date(END.getTime() - 30 * MS_PER_SECOND).toISOString(),
    );
    expect(stored.coinsEarned).toBe(0);
  });

  it("keeps a session active when the last heartbeat was under 30 seconds before the end", async () => {
    const user = await signUp("close-end@school.edu");
    const lastHeartbeatAt = new Date(END.getTime() - 10 * MS_PER_SECOND);
    const session = await insertSession(user.id, { lastHeartbeatAt });
    vi.setSystemTime(END);

    const response = await postHeartbeat(user.token, session.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ACTIVE");
    expect(body.lastHeartbeatAt).toBe(END.toISOString());
    expect(body.coinsEarned).toBe(0);
    expect(body.feedingMinutesEarned).toBe(0);
    expect(body.applesEarned).toBe(0);
  });

  it("does not abandon or complete a presence-met session resolved on a later day", async () => {
    const user = await signUp("later-day@school.edu");
    await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 40 },
    });
    const lastHeartbeatAt = new Date(END.getTime() - 10 * MS_PER_SECOND);
    const session = await insertSession(user.id, { lastHeartbeatAt });
    vi.setSystemTime(new Date(END.getTime() + 2 * 24 * 60 * MS_PER_MINUTE));

    const first = await postHeartbeat(user.token, session.id);
    const second = await postHeartbeat(user.token, session.id);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({
      id: session.id,
      status: "ACTIVE",
      lastHeartbeatAt: lastHeartbeatAt.toISOString(),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    const pet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(pet.coins).toBe(40);
  });

  it("does not revoke rewards when a completed session receives another heartbeat", async () => {
    const user = await signUp("completed@school.edu");
    const session = await insertSession(user.id, {
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
      lastHeartbeatAt: new Date(END.getTime() - 10 * MS_PER_SECOND),
    });
    vi.setSystemTime(new Date(END.getTime() + 5 * MS_PER_MINUTE));

    const response = await postHeartbeat(user.token, session.id);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: session.id,
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
      lastHeartbeatAt: new Date(
        END.getTime() - 10 * MS_PER_SECOND,
      ).toISOString(),
    });
  });

  it("keeps the newer heartbeat when two tabs renew at the same time", async () => {
    const user = await signUp("newer@school.edu");
    const session = await insertSession(user.id);
    const early = new Date(NOW.getTime() + 5 * MS_PER_SECOND);
    const late = new Date(NOW.getTime() + 12 * MS_PER_SECOND);

    await Promise.all([
      heartbeatSession(user.id, session.id, early),
      heartbeatSession(user.id, session.id, late),
    ]);

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(stored.status).toBe("ACTIVE");
    expect(stored.lastHeartbeatAt.toISOString()).toBe(late.toISOString());
    expect(stored.coinsEarned).toBe(0);
    expect(stored.feedingMinutesEarned).toBe(0);
    expect(stored.applesEarned).toBe(0);
  });

  it("does not revive an abandoned session when a renew and a lapse race", async () => {
    const user = await signUp("race-lapse@school.edu");
    const session = await insertSession(user.id, { coinsEarned: 9 });
    const renewAt = new Date(NOW.getTime() + 30 * MS_PER_SECOND - 1);
    const lapseAt = new Date(NOW.getTime() + 30 * MS_PER_SECOND);

    await Promise.all([
      heartbeatSession(user.id, session.id, renewAt),
      heartbeatSession(user.id, session.id, lapseAt),
    ]);

    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    if (stored.status === "ABANDONED") {
      expect(stored.lastHeartbeatAt.toISOString()).toBe(NOW.toISOString());
      expect(stored.coinsEarned).toBe(0);
      expect(stored.feedingMinutesEarned).toBe(0);
      expect(stored.applesEarned).toBe(0);
    } else {
      expect(stored.status).toBe("ACTIVE");
      expect(stored.lastHeartbeatAt.toISOString()).toBe(lapseAt.toISOString());
      expect(stored.coinsEarned).toBe(9);
      expect(stored.feedingMinutesEarned).toBe(0);
      expect(stored.applesEarned).toBe(0);
    }

    const followUp = await heartbeatSession(
      user.id,
      session.id,
      new Date(lapseAt.getTime() + 60 * MS_PER_SECOND),
    );
    if (stored.status === "ABANDONED") {
      expect(followUp.status).toBe("ABANDONED");
      expect(followUp.lastHeartbeatAt).toBe(NOW.toISOString());
    }
  });

  it("returns the stored completed rewards when two heartbeats arrive together", async () => {
    const user = await signUp("completed-race@school.edu");
    await testPrisma.pet.update({
      where: { userId: user.id },
      data: { coins: 25 },
    });
    const session = await insertSession(user.id, {
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });

    const responses = await Promise.all([
      heartbeatSession(user.id, session.id, new Date(END.getTime() + 1000)),
      heartbeatSession(user.id, session.id, new Date(END.getTime() + 2000)),
    ]);

    expect(responses).toEqual([
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
    const pet = await testPrisma.pet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(pet.coins).toBe(25);
  });
});
