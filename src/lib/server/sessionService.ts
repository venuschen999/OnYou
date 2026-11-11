import { Prisma, type FocusSession } from "@prisma/client";
import { getFeedingDay } from "@/lib/domain/feedingDay";
import { planSessionResolution, presenceDeadline } from "@/lib/domain/presence";
import { calculateRewards, type RewardResult } from "@/lib/domain/rewards";
import { SERVER_ERROR_MESSAGE } from "@/lib/messages";
import type { StartSessionInput } from "@/lib/validation/session";
import { prisma } from "./db";
import { AppError } from "./errors";

const MS_PER_MINUTE = 60_000;
const UNIQUE_VIOLATION = "P2002";
const ACTIVE_SESSION_MESSAGE = "One session at a time";
const NOT_FOUND_MESSAGE = "No session exists with that id.";
const FORBIDDEN_MESSAGE = "That session belongs to another account.";
const TOO_EARLY_MESSAGE = "This session has not reached its scheduled end.";
const ABANDONED_MESSAGE = "This session was abandoned and cannot be completed.";

type CompletionOutcome =
  | { kind: "completed"; session: FocusSession }
  | { kind: "abandoned" }
  | { kind: "too-early" };

export type SessionResponse = {
  id: string;
  taskName: string;
  durationMinutes: number;
  status: FocusSession["status"];
  startTime: string;
  endTime: string;
  lastHeartbeatAt: string;
  coinsEarned: number;
  feedingMinutesEarned: number;
  applesEarned: number;
};

function activeSessionError(): AppError {
  return new AppError("ACTIVE_SESSION_EXISTS", ACTIVE_SESSION_MESSAGE);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_VIOLATION
  );
}

function toPublicSession(session: FocusSession): SessionResponse {
  return {
    id: session.id,
    taskName: session.taskName,
    durationMinutes: session.durationMinutes,
    status: session.status,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    lastHeartbeatAt: session.lastHeartbeatAt.toISOString(),
    coinsEarned: session.coinsEarned,
    feedingMinutesEarned: session.feedingMinutesEarned,
    applesEarned: session.applesEarned,
  };
}

function clearedRewards(session: FocusSession): FocusSession {
  return {
    ...session,
    status: "ABANDONED",
    coinsEarned: 0,
    feedingMinutesEarned: 0,
    applesEarned: 0,
  };
}

async function lockSession(
  tx: Prisma.TransactionClient,
  sessionId: string,
): Promise<void> {
  // Hold the row until this resolution commits so a second tab cannot revive
  // an abandoned session or replace a newer heartbeat (PRD v2.9 §10).
  await tx.$queryRaw`SELECT id FROM "FocusSession" WHERE id = ${sessionId} FOR UPDATE`;
}

async function abandonActive(
  tx: Prisma.TransactionClient,
  session: FocusSession,
): Promise<FocusSession> {
  const abandoned = await tx.focusSession.updateMany({
    where: { id: session.id, status: "ACTIVE" },
    data: {
      status: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    },
  });
  if (abandoned.count !== 1) {
    return tx.focusSession.findUniqueOrThrow({ where: { id: session.id } });
  }
  return clearedRewards(session);
}

// Completion writes COMPLETED and rewards together (PRD v2.9 §5.3). A
// presence-met session past endTime stays ACTIVE here. Expiry is applied
// before any renewal.
export async function resolveSession(
  tx: Prisma.TransactionClient,
  session: FocusSession,
  now: Date,
): Promise<FocusSession> {
  if (session.status !== "ACTIVE") return session;
  const plan = planSessionResolution({
    endTime: session.endTime,
    lastHeartbeatAt: session.lastHeartbeatAt,
    now,
  });
  if (plan !== "ABANDON") return session;
  return abandonActive(tx, session);
}

async function renewHeartbeat(
  tx: Prisma.TransactionClient,
  session: FocusSession,
  now: Date,
): Promise<FocusSession> {
  const renewed = await tx.focusSession.updateMany({
    where: {
      id: session.id,
      status: "ACTIVE",
      lastHeartbeatAt: { lte: now },
    },
    data: { lastHeartbeatAt: now },
  });
  if (renewed.count !== 1) {
    return tx.focusSession.findUniqueOrThrow({ where: { id: session.id } });
  }
  return { ...session, lastHeartbeatAt: now };
}

async function loadOwnedSession(
  tx: Prisma.TransactionClient,
  userId: string,
  sessionId: string,
): Promise<FocusSession> {
  await lockSession(tx, sessionId);
  const session = await tx.focusSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    throw new AppError("SESSION_NOT_FOUND", NOT_FOUND_MESSAGE);
  }
  if (session.userId !== userId) {
    throw new AppError("FORBIDDEN", FORBIDDEN_MESSAGE);
  }
  return session;
}

export async function heartbeatSession(
  userId: string,
  sessionId: string,
  now: Date,
): Promise<SessionResponse> {
  return prisma.$transaction(async (tx) => {
    const session = await loadOwnedSession(tx, userId, sessionId);
    const resolved = await resolveSession(tx, session, now);
    if (resolved.status !== "ACTIVE") return toPublicSession(resolved);

    const plan = planSessionResolution({
      endTime: resolved.endTime,
      lastHeartbeatAt: resolved.lastHeartbeatAt,
      now,
    });
    if (plan !== "RENEW") return toPublicSession(resolved);
    return toPublicSession(await renewHeartbeat(tx, resolved, now));
  });
}

// Reading joins an existing session. Resolve expiry first, and do not treat
// this read as a heartbeat (PRD v2.9 §5.2, §10).
export async function getActiveSession(
  userId: string,
  now: Date,
): Promise<SessionResponse | null> {
  return prisma.$transaction(async (tx) => {
    const active = await tx.focusSession.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    if (!active) return null;

    await lockSession(tx, active.id);
    const locked = await tx.focusSession.findUniqueOrThrow({
      where: { id: active.id },
    });
    const resolved = await resolveSession(tx, locked, now);
    if (resolved.status !== "ACTIVE") return null;
    return toPublicSession(resolved);
  });
}

export async function startSession(
  userId: string,
  input: StartSessionInput,
  now: Date,
): Promise<SessionResponse> {
  try {
    return await prisma.$transaction(async (tx) => {
      const active = await tx.focusSession.findFirst({
        where: { userId, status: "ACTIVE" },
      });
      if (active) {
        await lockSession(tx, active.id);
        const locked = await tx.focusSession.findUniqueOrThrow({
          where: { id: active.id },
        });
        const resolved = await resolveSession(tx, locked, now);
        if (resolved.status === "ACTIVE") throw activeSessionError();
      }
      const created = await tx.focusSession.create({
        data: {
          userId,
          taskName: input.taskName,
          durationMinutes: input.durationMinutes,
          status: "ACTIVE",
          startTime: now,
          endTime: new Date(
            now.getTime() + input.durationMinutes * MS_PER_MINUTE,
          ),
          lastHeartbeatAt: now,
        },
      });
      return toPublicSession(created);
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw activeSessionError();
    throw error;
  }
}

function tooEarlyError(): AppError {
  return new AppError("SESSION_TOO_EARLY", TOO_EARLY_MESSAGE);
}

function abandonedError(): AppError {
  return new AppError("SESSION_ABANDONED", ABANDONED_MESSAGE);
}

function feedingDayDate(endTime: Date, timeZone: string): Date {
  // US6: credit the scheduled end's calendar day, even if resolved later.
  return new Date(`${getFeedingDay(endTime, timeZone)}T00:00:00.000Z`);
}

async function lockPet(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Pet" WHERE "userId" = ${userId} FOR UPDATE`;
}

async function readFinalOutcome(
  tx: Prisma.TransactionClient,
  sessionId: string,
): Promise<CompletionOutcome> {
  const current = await tx.focusSession.findUniqueOrThrow({
    where: { id: sessionId },
  });
  if (current.status === "COMPLETED") {
    return { kind: "completed", session: current };
  }
  if (current.status === "ABANDONED") return { kind: "abandoned" };
  throw new AppError("INTERNAL_ERROR", SERVER_ERROR_MESSAGE);
}

function completedSession(
  session: FocusSession,
  rewards: RewardResult,
): FocusSession {
  return {
    ...session,
    status: "COMPLETED",
    coinsEarned: rewards.coinsEarned,
    feedingMinutesEarned: rewards.feedingMinutesEarned,
    applesEarned: rewards.applesEarned,
  };
}

async function markCompleted(
  tx: Prisma.TransactionClient,
  session: FocusSession,
  rewards: RewardResult,
): Promise<FocusSession | null> {
  const completed = await tx.focusSession.updateMany({
    where: { id: session.id, status: "ACTIVE" },
    data: {
      status: "COMPLETED",
      coinsEarned: rewards.coinsEarned,
      feedingMinutesEarned: rewards.feedingMinutesEarned,
      applesEarned: rewards.applesEarned,
    },
  });
  if (completed.count !== 1) return null;
  return completedSession(session, rewards);
}

async function storeBalances(
  tx: Prisma.TransactionClient,
  petId: string,
  feedingDay: Date,
  rewards: RewardResult,
): Promise<void> {
  await tx.pet.update({
    where: { id: petId },
    data: { coins: { increment: rewards.coinsEarned } },
  });
  await tx.dailyFeeding.upsert({
    where: { petId_feedingDay: { petId, feedingDay } },
    create: {
      petId,
      feedingDay,
      feedingMinutes: rewards.feedingAfter.feedingMinutes,
      apples: rewards.feedingAfter.apples,
    },
    update: {
      feedingMinutes: rewards.feedingAfter.feedingMinutes,
      apples: rewards.feedingAfter.apples,
    },
  });
}

async function persistRewards(
  tx: Prisma.TransactionClient,
  session: FocusSession,
  petId: string,
  feedingDay: Date,
  rewards: RewardResult,
): Promise<CompletionOutcome> {
  const completed = await markCompleted(tx, session, rewards);
  if (!completed) return readFinalOutcome(tx, session.id);
  await storeBalances(tx, petId, feedingDay, rewards);
  return { kind: "completed", session: completed };
}

async function awardCompletion(
  tx: Prisma.TransactionClient,
  session: FocusSession,
): Promise<CompletionOutcome> {
  await lockPet(tx, session.userId);
  const pet = await tx.pet.findUnique({ where: { userId: session.userId } });
  if (!pet) throw new AppError("INTERNAL_ERROR", SERVER_ERROR_MESSAGE);

  const user = await tx.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { timezone: true },
  });
  const feedingDay = feedingDayDate(session.endTime, user.timezone);
  const feeding = await tx.dailyFeeding.findUnique({
    where: { petId_feedingDay: { petId: pet.id, feedingDay } },
  });
  const rewards = calculateRewards({
    status: "COMPLETED",
    durationMinutes: session.durationMinutes,
    feedingBefore: {
      feedingMinutes: feeding?.feedingMinutes ?? 0,
      apples: feeding?.apples ?? 0,
    },
  });
  return persistRewards(tx, session, pet.id, feedingDay, rewards);
}

async function finishCompletion(
  tx: Prisma.TransactionClient,
  session: FocusSession,
  now: Date,
): Promise<CompletionOutcome> {
  const resolved = await resolveSession(tx, session, now);
  if (resolved.status === "COMPLETED") {
    return { kind: "completed", session: resolved };
  }
  if (resolved.status === "ABANDONED") return { kind: "abandoned" };
  if (now.getTime() < resolved.endTime.getTime()) return { kind: "too-early" };

  const deadline = presenceDeadline(resolved.lastHeartbeatAt).getTime();
  if (deadline <= resolved.endTime.getTime()) {
    await abandonActive(tx, resolved);
    return { kind: "abandoned" };
  }
  return awardCompletion(tx, resolved);
}

export async function completeSession(
  userId: string,
  sessionId: string,
  now: Date,
): Promise<SessionResponse> {
  const outcome = await prisma.$transaction(async (tx) => {
    const session = await loadOwnedSession(tx, userId, sessionId);
    return finishCompletion(tx, session, now);
  });
  if (outcome.kind === "abandoned") throw abandonedError();
  if (outcome.kind === "too-early") throw tooEarlyError();
  return toPublicSession(outcome.session);
}
