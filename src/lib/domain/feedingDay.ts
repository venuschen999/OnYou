// US6: a session counts toward the feeding day of its scheduled end in the
// user's saved timezone, even when it is resolved later (PRD v2.9 §6).
// Returns the calendar date as YYYY-MM-DD.
export function getFeedingDay(endTime: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(endTime);

  // Built from parts so the result does not depend on a locale's date format.
  const { year, month, day } = Object.fromEntries(
    parts.map((p) => [p.type, p.value]),
  );
  return `${year}-${month}-${day}`;
}
