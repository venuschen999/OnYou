import type { FocusSession } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeedingState, getFeedingState } from "@/lib/domain/rewards";
import { AppError } from "@/lib/server/errors";
import { completeSession } from "@/lib/server/sessionService";

const USER_ID = "user_1";
const NOW = new Date("2026-11-09T15:00:00.000Z");
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const END = new Date(NOW.getTime() + 25 * MS_PER_MINUTE);

type FeedingRow = { feedingMinutes: number; apples: number };

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    focusSession: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    user: { findUniqueOrThrow: vi.fn() },
    pet: { findUnique: vi.fn(), update: vi.fn() },
    dailyFeeding: { findUnique: vi.fn(), upsert: vi.fn() },
  };
  const prisma = { $transaction: vi.fn() };
  return { prisma, tx };
});

vi.mock("@/lib/server/db", () => ({ prisma }));

let session: FocusSession | null = null;
let pet: { id: string; coins: number; name: string } | null = null;
let feeding: FeedingRow | null = null;
let loseUpdate: "completed" | "active" | null = null;

function storedSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: "session_1",
    userId: USER_ID,
    taskName: "Essay draft: intro",
    durationMinutes: 25,
    status: "ACTIVE",
    startTime: NOW,
    endTime: END,
    lastHeartbeatAt: new Date(END.getTime() - 10 * MS_PER_SECOND),
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
    ...overrides,
  };
}

beforeEach(() => {
  session = storedSession();
  pet = { id: "pet_1", coins: 0, name: "Mochi" };
  feeding = null;
  loseUpdate = null;
  prisma.$transaction.mockReset();
  prisma.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback !== "function") {
      throw new Error("expected a transaction callback");
    }
    return callback(tx);
  });
  tx.$queryRaw.mockReset();
  tx.$queryRaw.mockResolvedValue([]);
  tx.focusSession.findUnique.mockReset();
  tx.focusSession.findUnique.mockImplementation(async () => session);
  tx.focusSession.findUniqueOrThrow.mockReset();
  tx.focusSession.findUniqueOrThrow.mockImplementation(async () => {
    if (!session) throw new Error("session missing");
    return session;
  });
  tx.focusSession.updateMany.mockReset();
  tx.focusSession.updateMany.mockImplementation(
    async (args: {
      where: { status: string };
      data: Partial<FocusSession>;
    }) => {
      if (!session || session.status !== args.where.status) return { count: 0 };
      if (loseUpdate === "completed") {
        session = storedSession({
          status: "COMPLETED",
          coinsEarned: 25,
          feedingMinutesEarned: 25,
          applesEarned: 1,
        });
        return { count: 0 };
      }
      if (loseUpdate === "active") return { count: 0 };
      session = { ...session, ...args.data };
      return { count: 1 };
    },
  );
  tx.user.findUniqueOrThrow.mockReset();
  tx.user.findUniqueOrThrow.mockResolvedValue({
    timezone: "America/New_York",
  });
  tx.pet.findUnique.mockReset();
  tx.pet.findUnique.mockImplementation(async () => pet);
  tx.pet.update.mockReset();
  tx.pet.update.mockImplementation(
    async (args: { data: { coins: { increment: number } } }) => {
      if (!pet) throw new Error("pet missing");
      pet = { ...pet, coins: pet.coins + args.data.coins.increment };
      return pet;
    },
  );
  tx.dailyFeeding.findUnique.mockReset();
  tx.dailyFeeding.findUnique.mockImplementation(async () => feeding);
  tx.dailyFeeding.upsert.mockReset();
  tx.dailyFeeding.upsert.mockImplementation(
    async (args: { create: FeedingRow; update: FeedingRow }) => {
      feeding = feeding
        ? {
            feedingMinutes: args.update.feedingMinutes,
            apples: args.update.apples,
          }
        : {
            feedingMinutes: args.create.feedingMinutes,
            apples: args.create.apples,
          };
      return feeding;
    },
  );
});

describe("completeSession (US6, #15)", () => {
  it("stores rewards from the feeding day and increments the pet once", async () => {
    const result = await completeSession(USER_ID, "session_1", END);

    expect(result).toMatchObject({
      id: "session_1",
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
      lastHeartbeatAt: new Date(
        END.getTime() - 10 * MS_PER_SECOND,
      ).toISOString(),
    });
    expect(result.pet).toEqual({
      name: "Mochi",
      feedingState: "HUNGRY",
      apples: 1,
      feedingMinutes: 25,
      minutesUntilNextApple: 25,
    });
    expect(pet?.coins).toBe(25);
    expect(feeding).toEqual({ feedingMinutes: 25, apples: 1 });
    expect(getFeedingState(feeding?.apples ?? 0)).toBe(FeedingState.HUNGRY);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("caps the feeding day and still stores the earned coins", async () => {
    feeding = { feedingMinutes: 40, apples: 1 };
    pet = { id: "pet_1", coins: 30, name: "Mochi" };

    const result = await completeSession(USER_ID, "session_1", END);

    expect(result).toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 10,
      applesEarned: 1,
    });
    expect(result.pet).toEqual({
      name: "Mochi",
      feedingState: "FULL",
      apples: 2,
      feedingMinutes: 50,
      minutesUntilNextApple: 0,
    });
    expect(pet?.coins).toBe(55);
    expect(feeding).toEqual({ feedingMinutes: 50, apples: 2 });
    expect(getFeedingState(2)).toBe(FeedingState.FULL);
  });

  it("returns stored rewards for a completed session without writing again", async () => {
    session = storedSession({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
    pet = { id: "pet_1", coins: 25, name: "Mochi" };
    feeding = { feedingMinutes: 25, apples: 1 };

    const result = await completeSession(
      USER_ID,
      "session_1",
      new Date(END.getTime() + MS_PER_MINUTE),
    );

    expect(result).toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
    expect(result.pet).toEqual({
      name: "Mochi",
      feedingState: "HUNGRY",
      apples: 1,
      feedingMinutes: 25,
      minutesUntilNextApple: 25,
    });
    expect(pet?.coins).toBe(25);
    expect(feeding).toEqual({ feedingMinutes: 25, apples: 1 });
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
    expect(tx.pet.update).not.toHaveBeenCalled();
  });

  it("rejects completion before the scheduled end and leaves the session active", async () => {
    const error = await completeSession(
      USER_ID,
      "session_1",
      new Date(END.getTime() - 1),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: "SESSION_TOO_EARLY",
      status: 409,
      message: "This session has not reached its scheduled end.",
    });
    expect(session?.status).toBe("ACTIVE");
    expect(pet?.coins).toBe(0);
    expect(tx.pet.update).not.toHaveBeenCalled();
  });

  it("abandons a session whose deadline is at the scheduled end", async () => {
    session = storedSession({
      lastHeartbeatAt: new Date(END.getTime() - 30 * MS_PER_SECOND),
    });

    const error = await completeSession(USER_ID, "session_1", END).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ code: "SESSION_ABANDONED", status: 409 });
    expect(session).toMatchObject({
      status: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });
    expect(pet?.coins).toBe(0);
    expect(tx.pet.update).not.toHaveBeenCalled();
  });

  it("does not revive a session that is already abandoned", async () => {
    session = storedSession({
      status: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    });

    await expect(
      completeSession(USER_ID, "session_1", END),
    ).rejects.toMatchObject({ code: "SESSION_ABANDONED", status: 409 });
    expect(tx.pet.update).not.toHaveBeenCalled();
    expect(tx.dailyFeeding.upsert).not.toHaveBeenCalled();
  });

  it("rejects an unknown session and a session owned by someone else", async () => {
    session = null;
    await expect(
      completeSession(USER_ID, "missing", END),
    ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND", status: 404 });

    session = storedSession({ userId: "user_2" });
    await expect(
      completeSession(USER_ID, "session_1", END),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(session.status).toBe("ACTIVE");
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
  });

  it("does not award rewards when the conditional update loses the race", async () => {
    loseUpdate = "completed";
    pet = { id: "pet_1", coins: 25, name: "Mochi" };

    const result = await completeSession(USER_ID, "session_1", END);

    expect(result).toMatchObject({
      status: "COMPLETED",
      coinsEarned: 25,
      feedingMinutesEarned: 25,
      applesEarned: 1,
    });
    expect(pet.coins).toBe(25);
    expect(tx.pet.update).not.toHaveBeenCalled();
    expect(tx.dailyFeeding.upsert).not.toHaveBeenCalled();
  });

  it("stops after the session write when the pet update fails", async () => {
    tx.pet.update.mockRejectedValue(new Error("pet write failed"));

    await expect(completeSession(USER_ID, "session_1", END)).rejects.toThrow(
      "pet write failed",
    );
    expect(tx.focusSession.updateMany).toHaveBeenCalled();
    expect(tx.dailyFeeding.upsert).not.toHaveBeenCalled();
  });

  it("fails before writing rewards when the account has no pet", async () => {
    pet = null;

    await expect(
      completeSession(USER_ID, "session_1", END),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR", status: 500 });
    expect(session?.status).toBe("ACTIVE");
    expect(tx.focusSession.updateMany).not.toHaveBeenCalled();
  });
});
