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
import { GET as listSessions } from "@/app/api/sessions/route";
import { HISTORY_PAGE_SIZE } from "@/lib/domain/history";
import { AUTH_COOKIE_NAME } from "@/lib/server/authToken";
import { buildSession } from "../factories";
import { resetTestDatabase, testPrisma } from "./testDb";

const PASSWORD = "sunflower22";
const TIMEZONE = "America/New_York";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_MINUTE = 60_000;
const ITEM_KEYS = [
  "coinsEarned",
  "date",
  "durationMinutes",
  "feedingMinutesEarned",
  "id",
  "outcome",
  "taskName",
];

type HistoryItem = {
  id: string;
  taskName: string;
  date: string;
  durationMinutes: number;
  outcome: "COMPLETED" | "ABANDONED";
  coinsEarned: number;
  feedingMinutesEarned: number;
};

type HistoryPage = {
  items: HistoryItem[];
  nextCursor: string | null;
};

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

function historyRequest(token: string | undefined, query = ""): Request {
  const headers = new Headers();
  if (token) headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  return new Request(`http://localhost/api/sessions${query}`, {
    method: "GET",
    headers,
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
  id: string,
  startTime: Date,
  overrides: Parameters<typeof buildSession>[1] = {},
) {
  const durationMinutes = overrides.durationMinutes ?? 25;
  return testPrisma.focusSession.create({
    data: buildSession(userId, {
      id,
      taskName: id,
      durationMinutes,
      status: "COMPLETED",
      startTime,
      endTime: new Date(startTime.getTime() + durationMinutes * MS_PER_MINUTE),
      lastHeartbeatAt: startTime,
      coinsEarned: durationMinutes,
      feedingMinutesEarned: durationMinutes,
      applesEarned: 0,
      ...overrides,
    }),
  });
}

async function readPage(response: Response): Promise<HistoryPage> {
  expect(response.status).toBe(200);
  return (await response.json()) as HistoryPage;
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

describe("GET /api/sessions (US8, #22)", () => {
  it("requires an authenticated account", async () => {
    const response = await listSessions(historyRequest(undefined));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "UNAUTHENTICATED", message: "Log in to continue." },
    });
  });

  it("lists only the caller's completed and abandoned sessions, newest first", async () => {
    const owner = await signUp("jo@school.edu");
    const other = await signUp("sam@school.edu");
    const older = new Date("2026-11-08T15:00:00.000Z");
    const newer = new Date("2026-11-09T14:00:00.000Z");
    await insertSession(owner.id, "owned_old", older, {
      taskName: "Problem set 6",
      durationMinutes: 15,
      coinsEarned: 15,
      feedingMinutesEarned: 15,
    });
    await insertSession(owner.id, "owned_new", newer, {
      taskName: "Essay draft: intro",
      status: "ABANDONED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
    await insertSession(owner.id, "owned_active", NOW, {
      taskName: "Still focusing",
      status: "ACTIVE",
      endTime: new Date(NOW.getTime() + 25 * MS_PER_MINUTE),
      lastHeartbeatAt: NOW,
    });
    await insertSession(other.id, "other_done", newer, {
      taskName: "Someone else's session",
    });

    const page = await readPage(
      await listSessions(historyRequest(owner.token)),
    );

    expect(page.items.map((item) => item.taskName)).toEqual([
      "Essay draft: intro",
      "Problem set 6",
    ]);
    expect(page.nextCursor).toBeNull();
    expect(Object.keys(page.items[0] ?? {}).sort()).toEqual(ITEM_KEYS);
    expect(page.items[0]).toMatchObject({
      id: "owned_new",
      date: newer.toISOString(),
      durationMinutes: 25,
      outcome: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
    });
    expect(page.items[1]).toMatchObject({
      outcome: "COMPLETED",
      coinsEarned: 15,
      feedingMinutesEarned: 15,
      durationMinutes: 15,
    });
    expect(JSON.stringify(page)).not.toContain("Someone else's session");
    expect(JSON.stringify(page)).not.toContain("Still focusing");
  });

  it("orders equal start times by id descending", async () => {
    const owner = await signUp("jo@school.edu");
    const startTime = new Date("2026-11-07T15:00:00.000Z");
    await insertSession(owner.id, "hist_a", startTime, { taskName: "A" });
    await insertSession(owner.id, "hist_c", startTime, { taskName: "C" });
    await insertSession(owner.id, "hist_b", startTime, { taskName: "B" });

    const page = await readPage(
      await listSessions(historyRequest(owner.token)),
    );

    expect(page.items.map((item) => item.id)).toEqual([
      "hist_c",
      "hist_b",
      "hist_a",
    ]);
  });

  it("returns the next page of 20 and then a null cursor", async () => {
    const owner = await signUp("jo@school.edu");
    const base = new Date("2026-10-01T15:00:00.000Z");
    for (let index = 0; index <= HISTORY_PAGE_SIZE; index += 1) {
      await insertSession(
        owner.id,
        `h${String(index).padStart(2, "0")}`,
        new Date(base.getTime() + index * MS_PER_MINUTE),
        { taskName: `Session ${index}` },
      );
    }

    const first = await readPage(
      await listSessions(historyRequest(owner.token)),
    );
    expect(first.items).toHaveLength(HISTORY_PAGE_SIZE);
    expect(first.items[0]?.id).toBe("h20");
    expect(first.items[19]?.id).toBe("h01");
    expect(first.nextCursor).toBe("h01");

    const second = await readPage(
      await listSessions(
        historyRequest(owner.token, `?cursor=${first.nextCursor}&limit=20`),
      ),
    );
    expect(second.items.map((item) => item.id)).toEqual(["h00"]);
    expect(second.nextCursor).toBeNull();
  });

  it("returns a null cursor when the account has exactly 20 final sessions", async () => {
    const owner = await signUp("jo@school.edu");
    const base = new Date("2026-10-01T15:00:00.000Z");
    for (let index = 0; index < HISTORY_PAGE_SIZE; index += 1) {
      await insertSession(
        owner.id,
        `p${String(index).padStart(2, "0")}`,
        new Date(base.getTime() + index * MS_PER_MINUTE),
      );
    }

    const page = await readPage(
      await listSessions(historyRequest(owner.token, "?limit=20")),
    );

    expect(page.items).toHaveLength(HISTORY_PAGE_SIZE);
    expect(page.nextCursor).toBeNull();
  });

  it("rejects a cursor that is not in this account's final history", async () => {
    const owner = await signUp("jo@school.edu");
    const other = await signUp("sam@school.edu");
    const startTime = new Date("2026-11-08T15:00:00.000Z");
    await insertSession(other.id, "foreign_session", startTime, {
      taskName: "Private notes",
    });
    await insertSession(owner.id, "owned_active", NOW, {
      status: "ACTIVE",
      endTime: new Date(NOW.getTime() + 25 * MS_PER_MINUTE),
      lastHeartbeatAt: NOW,
      taskName: "Still focusing",
    });

    const responses = [
      await listSessions(
        historyRequest(owner.token, "?cursor=foreign_session"),
      ),
      await listSessions(historyRequest(owner.token, "?cursor=owned_active")),
      await listSessions(
        historyRequest(owner.token, "?cursor=missing_session"),
      ),
    ];

    for (const response of responses) {
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toMatchObject({
        error: {
          code: "VALIDATION_ERROR",
          fields: {
            cursor: "That cursor is not in this account's history.",
          },
        },
      });
      expect(JSON.stringify(body)).not.toContain("Private notes");
    }
  });

  it("rejects a page size other than 20", async () => {
    const owner = await signUp("jo@school.edu");

    const response = await listSessions(
      historyRequest(owner.token, "?limit=21"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fields: { limit: "History pages contain 20 sessions." },
      },
    });
  });

  it("abandons an expired active session before listing history", async () => {
    const owner = await signUp("jo@school.edu");
    const startTime = new Date("2026-11-09T12:00:00.000Z");
    const endTime = new Date(startTime.getTime() + 25 * MS_PER_MINUTE);
    await insertSession(owner.id, "expired_active", startTime, {
      taskName: "Left unattended",
      status: "ACTIVE",
      endTime,
      lastHeartbeatAt: startTime,
      coinsEarned: 25,
      feedingMinutesEarned: 25,
    });

    const page = await readPage(
      await listSessions(historyRequest(owner.token)),
    );
    const stored = await testPrisma.focusSession.findUniqueOrThrow({
      where: { id: "expired_active" },
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        id: "expired_active",
        outcome: "ABANDONED",
        coinsEarned: 0,
        feedingMinutesEarned: 0,
      }),
    ]);
    expect(stored.status).toBe("ABANDONED");
    expect(stored.coinsEarned).toBe(0);
    expect(stored.feedingMinutesEarned).toBe(0);
  });
});
