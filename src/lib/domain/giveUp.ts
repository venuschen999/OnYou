import { presenceDeadline } from "./presence";

const MS_PER_MINUTE = 60_000;

export type GiveUpDecision = "ABANDON" | "COMPLETE";

export type GiveUpInput = {
  endTime: Date;
  lastHeartbeatAt: Date;
  now: Date;
};

// PRD v2.9 §5.3: Give up before the scheduled end abandons. At or after the
// end, a session whose presence deadline is strictly later than the end
// completes; otherwise it is abandoned.
export function decideGiveUp(input: GiveUpInput): GiveUpDecision {
  const endMs = input.endTime.getTime();
  if (input.now.getTime() < endMs) return "ABANDON";
  const deadlineMs = presenceDeadline(input.lastHeartbeatAt).getTime();
  return deadlineMs > endMs ? "COMPLETE" : "ABANDON";
}

export function elapsedWholeMinutes(startTime: Date, now: Date): number {
  const elapsedMs = now.getTime() - startTime.getTime();
  return Math.max(0, Math.floor(elapsedMs / MS_PER_MINUTE));
}

// docs/agent-memory/sessions.md S11: mockup copy, with the singular and the
// under-a-minute wording the mockup does not show.
export function giveUpMessage(elapsedMinutes: number): string {
  const soFar =
    elapsedMinutes === 0
      ? "the time so far"
      : `the ${elapsedMinutes} ${elapsedMinutes === 1 ? "minute" : "minutes"} so far`;
  return `Mochi gets nothing from this session, and ${soFar} won’t count. Earlier progress stays safe. This ends the session in every open tab.`;
}
