# Pet decisions (US3)

Default pet creation and naming. PRD v2.9 US3, §7; `AGENTS.md` §7.

## P1. Signup creates Mochi in the same transaction (moved into #8)

- **Decision:** `POST /api/auth/signup` creates the `User` and its `Pet` (name `Mochi`, coins 0) in one `prisma.$transaction`. If either insert fails, neither is saved.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** AGENTS §7 says "Signup creates the account and Mochi in one transaction". Doing it in #8 means no user ever exists without a pet.
- **Applies to:** #8 (`authService.signUp`); #10 no longer needs to create the pet.
- **Status:** Decided.

## P2. Rename stays out of #8

- **Decision:** #8 takes only pet *creation* from #10. Renaming (`PATCH /api/pet`, Settings "Save name", trimming and the 30-character limit) stays in #10.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Applies to:** #8, #10.
- **Status:** Decided.

## P3. Port the whole mockup pet SVG in #9

- **Decision:** #9 ports the mockup's in-code `pet(state, bowl)` SVG function as one `PetArt` component with every state (starving, hungry, full, slapped; optional bowl). Auth screens use the "waiting" look, which the mockup draws as the hungry face with no bowl and `alt`/`aria-label` "Mochi is waiting". #20 reuses `PetArt` rather than porting again.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** AGENTS §7 says to reuse the mockup's SVG, never substitute art; one port avoids two copies drifting apart.
- **Applies to:** #9, #17 (slapped), #20.
- **Status:** Decided.

## P4. Pet progress is a read-only snapshot for today

- **Decision:** `GET /api/pet` returns `{ name, coins, applesToday, feedingMinutesTowardNextApple, feedingState }` for the signed-in owner, the shape `PetProgress` in #20 already uses. "Today" is `getFeedingDay(now, user.timezone)`. With no `DailyFeeding` row for today, apples and feeding minutes are 0, which is the daily reset; coins come from `Pet.coins` and never reset. The read does not resolve or complete a running session, so it has no side effects; a finished session's rewards appear once completion runs.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 US4 and §6. Matching #20's existing shape lets the dashboard load the endpoint without a mapping layer. Session resolution stays with the session routes (AGENTS.md §3).
- **Applies to:** #19 (`GET /api/pet`, `docs/openapi.yaml`), #20.
- **Status:** Decided.
