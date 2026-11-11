import type { FocusSession } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveSession } from "@/lib/server/sessionService";

const USER_ID = "user_1";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    focusSession: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
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
    taskName: "Essay draft: intro",
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
  tx.focusSession.findUniqueOrThrow.mockReset();
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

describe("getActiveSession (US5, #13)", () => {
  it("returns the caller's active session and does not renew the heartbeat", async () => {
    tx.focusSession.findFirst.mockResolvedValue(storedSession());

    const result = await getActiveSession(USER_ID, NOW);

    expect(tx.focusSession.findFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: "ACTIVE" },
    });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: "session_1",
      taskName: "Essay draft: intro",
      status: "ACTIVE",
      lastHeartbeatAt: NOW.toISOString(),
      coinsEarned: 0,
    });
  });

  it("returns null when the account has no active session", async () => {
    tx.focusSession.findFirst.mockResolvedValue(null);

    await expect(getActiveSession(USER_ID, NOW)).resolves.toBeNull();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
  });

  it("abandons a lapsed session and does not return it", async () => {
    tx.focusSession.findFirst.mockResolvedValue(
      storedSession({
        lastHeartbeatAt: new Date(NOW.getTime() - 30 * MS_PER_SECOND),
        coinsEarned: 9,
        feedingMinutesEarned: 9,
        applesEarned: 1,
      }),
    );
    tx.focusSession.updateMany.mockResolvedValue({ count: 1 });

    await expect(getActiveSession(USER_ID, NOW)).resolves.toBeNull();
    expect(tx.focusSession.updateMany).toHaveBeenCalledWith({
      where: { id: "session_1", status: "ACTIVE" },
      data: {
        status: "ABANDONED",
        coinsEarned: 0,
        feedingMinutesEarned: 0,
        applesEarned: 0,
      },
    });
  });

  it("keeps a presence-met session active after the scheduled end", async () => {
    const endTime = new Date(NOW.getTime() - MS_PER_MINUTE);
    tx.focusSession.findFirst.mockResolvedValue(
      storedSession({
        endTime,
        lastHeartbeatAt: new Date(endTime.getTime() - 10 * MS_PER_SECOND),
      }),
    );

    const result = await getActiveSession(USER_ID, NOW);

    expect(result).toMatchObject({
      status: "ACTIVE",
      endTime: endTime.toISOString(),
      coinsEarned: 0,
    });
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
  });
});
