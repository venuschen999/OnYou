import { Prisma, type FocusSession } from "@prisma/client";
import { decidePresence } from "@/lib/domain/presence";
import type { StartSessionInput } from "@/lib/validation/session";
import { prisma } from "./db";
import { AppError } from "./errors";

const MS_PER_MINUTE = 60_000;
const UNIQUE_VIOLATION = "P2002";
const ACTIVE_SESSION_MESSAGE = "One session at a time";

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

// #15 writes COMPLETED and rewards together (PRD v2.9 §5.3). Until that
// service exists, a presence-met session past endTime stays ACTIVE.
async function abandonIfPresenceLapsed(
  tx: Prisma.TransactionClient,
  session: FocusSession,
  now: Date,
): Promise<"blocked" | "clear"> {
  const decision = decidePresence({
    endTime: session.endTime,
    lastHeartbeatAt: session.lastHeartbeatAt,
    now,
  });
  if (decision !== "ABANDON") return "blocked";

  const abandoned = await tx.focusSession.updateMany({
    where: { id: session.id, status: "ACTIVE" },
    data: {
      status: "ABANDONED",
      coinsEarned: 0,
      feedingMinutesEarned: 0,
      applesEarned: 0,
    },
  });
  return abandoned.count === 1 ? "clear" : "blocked";
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
        const outcome = await abandonIfPresenceLapsed(tx, active, now);
        if (outcome === "blocked") throw activeSessionError();
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
