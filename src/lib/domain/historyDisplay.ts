export type HistoryOutcome = "COMPLETED" | "ABANDONED";

export type HistoryEntry = {
  id: string;
  taskName: string;
  startedAt: string;
  durationMinutes: number;
  outcome: HistoryOutcome;
  coinsEarned: number;
  feedingMinutesEarned: number;
};

type HistoryOrder = { id: string; startedAt: string };

const CLOCK: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

function localDay(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(instant);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

function formatClock(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { ...CLOCK, timeZone }).format(
    instant,
  );
}

function formatWeekdayMonthDay(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  }).formatToParts(instant);
  return `${part(parts, "weekday")} ${part(parts, "month")} ${part(parts, "day")}`;
}

// Callers pass both clocks. This module does not read the current time.
export function formatHistoryWhen(
  instant: Date,
  now: Date,
  timeZone: string,
): string {
  const clock = formatClock(instant, timeZone);
  if (localDay(instant, timeZone) === localDay(now, timeZone)) {
    return `Today, ${clock}`;
  }
  return `${formatWeekdayMonthDay(instant, timeZone)}, ${clock}`;
}

export function historyEndNote(firstSessionAt: Date, timeZone: string): string {
  const day = formatWeekdayMonthDay(firstSessionAt, timeZone);
  return `That’s every session. Your first one was on ${day}.`;
}

export function historyOutcomeLabel(outcome: HistoryOutcome): string {
  return outcome === "COMPLETED" ? "Completed" : "Abandoned";
}

export function formatHistoryDuration(durationMinutes: number): string {
  return `${durationMinutes} min`;
}

export function formatHistoryCoins(coinsEarned: number): string {
  return `+${coinsEarned} coins`;
}

export function formatHistoryFeeding(feedingMinutesEarned: number): string {
  return `+${feedingMinutesEarned} feeding min`;
}

// Newest start time first. The same instant uses id descending (US8, #23).
export function compareHistoryNewestFirst(
  left: HistoryOrder,
  right: HistoryOrder,
): number {
  const time = Date.parse(right.startedAt) - Date.parse(left.startedAt);
  if (time !== 0) return time;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}
