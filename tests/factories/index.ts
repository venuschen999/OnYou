import type { Prisma } from "@prisma/client";

const DEFAULT_DURATION_MINUTES = 25;
const MS_PER_MINUTE = 60_000;

let sequence = 0;

export function buildUser(
  overrides: Partial<Prisma.UserCreateInput> = {},
): Prisma.UserCreateInput {
  sequence += 1;
  return {
    email: `user${sequence}@example.com`,
    passwordHash: "not-a-real-hash",
    timezone: "America/New_York",
    ...overrides,
  };
}

export function buildSession(
  userId: string,
  overrides: Partial<Prisma.FocusSessionUncheckedCreateInput> = {},
): Prisma.FocusSessionUncheckedCreateInput {
  const startTime = new Date("2026-11-03T15:00:00.000Z");
  const durationMinutes = overrides.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  return {
    userId,
    taskName: "Focus session",
    durationMinutes,
    startTime,
    endTime: new Date(startTime.getTime() + durationMinutes * MS_PER_MINUTE),
    lastHeartbeatAt: startTime,
    ...overrides,
  };
}
