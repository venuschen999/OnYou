const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const PAD_SECONDS = 10;

// Display-only. Callers pass both clocks; this module does not read the time.
export const COUNTDOWN_TICK_MS = MS_PER_SECOND;

export function remainingMilliseconds(endTime: Date, now: Date): number {
  const remaining = endTime.getTime() - now.getTime();
  return remaining > 0 ? remaining : 0;
}

export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const padded = seconds < PAD_SECONDS ? `0${seconds}` : String(seconds);
  return `${minutes}:${padded}`;
}

export function formatCountdownAnnouncement(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / MS_PER_SECOND);
  if (totalSeconds === 0) return "0 minutes remaining";
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes} minutes ${seconds} seconds remaining`;
}

export function formatEndClock(endTime: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(endTime);
}
