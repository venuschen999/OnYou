// US6: a session counts toward the feeding day of its scheduled end in the
// user's saved timezone, even when it is resolved later (PRD v2.9 §6).
// Returns the calendar date as YYYY-MM-DD.
export function getFeedingDay(endTime: Date, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(endTime);
}
