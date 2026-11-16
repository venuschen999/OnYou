// DailyFeeding.feedingDay is a @db.Date. Sessions (credited on endTime, US6)
// and the pet read (today, US4) must convert a getFeedingDay result the same
// way, or they would read and write different rows.
export function feedingDayDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
