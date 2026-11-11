# Reward decisions (US4, US6)

Coins, feeding minutes, apples, and feeding day. PRD v2.9 §6; `AGENTS.md` §8.

## R1. Reward and feeding-day functions take no `now`

- **Decision:** `calculateRewards` and `getFeedingDay` take no `now` parameter. The feeding day comes only from the session `endTime` and the user's saved IANA timezone. The resolution time is not an input, so a session resolved on a later day is still credited to its scheduled end's day.
- **Date / decided by:** 2026-11-10, Partner A (`venuschen999`).
- **Why:** No reward rule depends on the current time (PRD v2.9 §6, "Day assignment"). An unused `now` would need a comment only to explain why it is ignored (`AGENTS.md` §5). Leaving it out makes it impossible to credit the current day by mistake.
- **Applies to:** #11 (`src/lib/domain/rewards.ts`, `src/lib/domain/feedingDay.ts`); #15 and #21 call them.
- **Status:** Decided.

## R2. Apples are derived from the day's feeding minutes

- **Decision:** A feeding day's apples equal `min(MAX_APPLES_PER_DAY, floor(feedingMinutes / APPLE_MINUTES))`. Minutes toward the next apple are `feedingMinutes % APPLE_MINUTES`. `calculateRewards` returns the earned amounts and the day's totals afterwards. #15 stores both.
- **Date / decided by:** 2026-11-10, Partner A (`venuschen999`).
- **Why:** PRD v2.9 §6 gives one apple per 25 feeding minutes with leftover minutes carrying on the same day, and caps the day at 50 minutes and 2 apples. Deriving apples from minutes keeps the two stored counts consistent.
- **Applies to:** #11, #15, #19.
- **Status:** Decided.
