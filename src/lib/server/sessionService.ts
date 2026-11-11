import { Prisma, type FocusSession } from "@prisma/client";
import { planSessionResolution } from "@/lib/domain/presence";
import type { StartSessionInput } from "@/lib/validation/session";
import { prisma } from "./db";
import { AppError } from "./errors";

const MS_PER_MINUTE = 60_000;
const UNIQUE_VIOLATION = "P2002";
const ACTIVE_SESSION_MESSAGE = "One session at a time";
const NOT_FOUND_MESSAGE = "No session exists with that id.";
const FORBIDDEN_MESSAGE = "That session belongs to another account.";

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

// #15 writes COMPLETED and rewards together (PRD v2.9 §5.3). A presence-met
// session past endTime stays ACTIVE. Expiry is applied before any renewal.
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
