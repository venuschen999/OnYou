// Presence deadline = latest accepted heartbeat + 30 seconds (PRD v2.9 §5.2).
export const PRESENCE_GRACE_SECONDS = 30;

const MS_PER_SECOND = 1000;

export type PresenceDecision = "ACTIVE" | "ABANDON" | "ELIGIBLE_TO_COMPLETE";

export type PresenceInput = {
  endTime: Date;
  lastHeartbeatAt: Date;
  now: Date;
};

export function presenceDeadline(lastHeartbeatAt: Date): Date {
  return new Date(
    lastHeartbeatAt.getTime() + PRESENCE_GRACE_SECONDS * MS_PER_SECOND,
  );
}

// `now` is the caller's clock. Outcome is judged against the scheduled end,
// not against how late this request arrived (PRD v2.9 §5.3, §10).
export function decidePresence(input: PresenceInput): PresenceDecision {
  const deadlineMs = presenceDeadline(input.lastHeartbeatAt).getTime();
  const endMs = input.endTime.getTime();
  const nowMs = input.now.getTime();

  if (nowMs >= endMs) {
    return deadlineMs > endMs ? "ELIGIBLE_TO_COMPLETE" : "ABANDON";
  }
  if (nowMs >= deadlineMs) return "ABANDON";
  return "ACTIVE";
}

export type SessionResolution = "ABANDON" | "RENEW" | "HOLD";

// Shared order for every session operation (PRD v2.9 §10): `decidePresence`
// checks the scheduled end before a later expiry, and an expired heartbeat is
// not renewed. HOLD leaves the row Active so #15 can store Completed and
// rewards in one update.
export function planSessionResolution(input: PresenceInput): SessionResolution {
  if (decidePresence(input) === "ABANDON") return "ABANDON";
  if (input.now.getTime() < presenceDeadline(input.lastHeartbeatAt).getTime()) {
    return "RENEW";
  }
  return "HOLD";
}
