import { Prisma, type FocusSession } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/server/errors";
import { startSession } from "@/lib/server/sessionService";
import type { StartSessionInput } from "@/lib/validation/session";

const USER_ID = "user_1";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const INPUT: StartSessionInput = {
  taskName: "Essay draft",
  durationMinutes: 25,
};

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    focusSession: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  };
  const prisma = {
    $transaction: vi.fn(),
  };
  return { prisma, tx };
});

vi.mock("@/lib/server/db", () => ({ prisma }));

function storedSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "session_1",
    userId: USER_ID,
    taskName: "Essay draft",
    durationMinutes: 25,
    status: "ACTIVE",
    startTime: NOW,
    endTime: new Date(NOW.getTime() + 25 * MS_PER_MINUTE),
    lastHeartbeatAt: NOW,
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
    ...overrides,
  };
}

function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  prisma.$transaction.mockReset();
  prisma.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback !== "function") {
      throw new Error("expected a transaction callback");
    }
    return callback(tx);
  });
  tx.$queryRaw.mockReset();
  tx.$queryRaw.mockResolvedValue([]);
  tx.focusSession.findFirst.mockReset();
  tx.focusSession.updateMany.mockReset();
  tx.focusSession.create.mockReset();
  tx.focusSession.findUniqueOrThrow.mockReset();
  // Start locks the row it already found and reads it again before resolving.
  tx.focusSession.findUniqueOrThrow.mockImplementation(() => {
    const last = tx.focusSession.findFirst.mock.results.at(-1);
    if (!last || last.type !== "return") {
      return Promise.reject(
        new Error("expected the active session to be loaded"),
      );
    }
    return last.value;
  });
});

describe("startSession (US5, #12)", () => {
  it("records the server clock as the first heartbeat and returns zero rewards", async () => {
    tx.focusSession.findFirst.mockResolvedValue(null);
    tx.focusSession.create.mockResolvedValue(
      storedSession({ id: "session_new" }),
    );

    const result = await startSession(USER_ID, INPUT, NOW);

    expect(tx.focusSession.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        taskName: "Essay draft",
        durationMinutes: 25,
        status: "ACTIVE",
        startTime: NOW,
        endTime: new Date(NOW.getTime() + 25 * MS_PER_MINUTE),
        lastHeartbeatAt: NOW,
      },
    });
    expect(result).toEqual({
      id: "session_new",
      taskName: "Essay draft",
      durationMinutes: 25,
      status: "ACTIVE",
      startTime: NOW.toISOString(),
      endTime: new Date(NOW.getTime() + 25 * MS_PER_MINUTE).toISOString(),
      lastHeartbeatAt: NOW.toISOString(),
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
  });

  it("rejects a second start while the active session is still inside its deadline", async () => {
    tx.focusSession.findFirst.mockResolvedValue(storedSession());

    await expect(startSession(USER_ID, INPUT, NOW)).rejects.toMatchObject({
      code: "ACTIVE_SESSION_EXISTS",
      status: 409,
      message: "One session at a time",
    });
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
    expect(tx.focusSession.create).not.toHaveBeenCalled();
  });

  it("keeps a presence-met session active past its end instead of completing it", async () => {
    const endTime = new Date(NOW.getTime() - MS_PER_MINUTE);
    tx.focusSession.findFirst.mockResolvedValue(
      storedSession({
        taskName: "Ready to complete",
        endTime,
        lastHeartbeatAt: new Date(endTime.getTime() - 10 * MS_PER_SECOND),
      }),
    );

    const error = await startSession(USER_ID, INPUT, NOW).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AppError);
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
    expect(tx.focusSession.create).not.toHaveBeenCalled();
  });

  it("abandons a lapsed session with zero rewards, then starts the new one", async () => {
    const stale = storedSession({
      id: "session_stale",
      taskName: "Stale session",
      lastHeartbeatAt: new Date(NOW.getTime() - 30 * MS_PER_SECOND),
      coinsEarned: 7,
      feedingMinutesEarned: 7,
      applesEarned: 1,
    });
    tx.focusSession.findFirst.mockResolvedValue(stale);
    tx.focusSession.updateMany.mockResolvedValue({ count: 1 });
    tx.focusSession.create.mockResolvedValue(
      storedSession({ id: "session_new", taskName: "Fresh start" }),
    );

    const result = await startSession(
      USER_ID,
      { taskName: "Fresh start", durationMinutes: 15 },
      NOW,
    );

    expect(tx.focusSession.updateMany).toHaveBeenCalledWith({
      where: { id: "session_stale", status: "ACTIVE" },
      data: {
        status: "ABANDONED",
        coinsEarned: 0,
        feedingMinutesEarned: 0,
        applesEarned: 0,
      },
    });
    expect(result.id).toBe("session_new");
    expect(result.taskName).toBe("Fresh start");
  });

  it("does not start a session when the stale row was no longer active", async () => {
    tx.focusSession.findFirst.mockResolvedValue(
      storedSession({
        lastHeartbeatAt: new Date(NOW.getTime() - 30 * MS_PER_SECOND),
      }),
    );
    tx.focusSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(startSession(USER_ID, INPUT, NOW)).rejects.toMatchObject({
      code: "ACTIVE_SESSION_EXISTS",
    });
    expect(tx.focusSession.create).not.toHaveBeenCalled();
  });

  it("turns a lost unique-index race into one session at a time", async () => {
    tx.focusSession.findFirst.mockResolvedValue(null);
    tx.focusSession.create.mockRejectedValue(uniqueViolation());

    await expect(startSession(USER_ID, INPUT, NOW)).rejects.toMatchObject({
      code: "ACTIVE_SESSION_EXISTS",
      status: 409,
    });
  });

  it("rethrows a database error that is not a unique violation", async () => {
    const failure = new Error("database unavailable");
    tx.focusSession.findFirst.mockResolvedValue(null);
    tx.focusSession.create.mockRejectedValue(failure);

    await expect(startSession(USER_ID, INPUT, NOW)).rejects.toBe(failure);
  });
});
