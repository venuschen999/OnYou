import { SessionStatus } from "../../src/lib/domain/sessionStatus";
import type { RewardSession } from "../../src/lib/domain/rewards";

const DEFAULT_END_TIME = new Date("2026-10-28T20:00:00.000Z");

export function buildRewardSession(
  overrides: Partial<RewardSession> = {},
): RewardSession {
  return {
    status: SessionStatus.COMPLETED,
    durationMinutes: 25,
    endTime: new Date(DEFAULT_END_TIME),
    ...overrides,
  };
}
