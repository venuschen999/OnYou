export function feedingDay(instant: Date, timeZone: string): string {
  // en-CA with numeric fields yields the calendar date as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}
