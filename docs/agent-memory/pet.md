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

## P5. Renaming the pet

- **Decision:** `PATCH /api/pet` takes `{ name }` for the signed-in owner. The shared `petNameSchema` trims the name; a blank or spaces-only name becomes `Mochi`; more than 30 characters (counted as characters, so an emoji is one) is `400` `VALIDATION_ERROR` with `fields.name` `Pet names can be up to 30 characters. This one has N.` Nothing is truncated. The response is `200` with the same `PetProgress` body as `GET /api/pet`.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 §7 and US3; the error copy is the mockup's "Pet name too long" state. Returning `PetProgress` lets a screen refresh from the response.
- **Applies to:** #10.
- **Status:** Decided.

## P6. Settings Pet section and account email

- **Decision:** Settings shows a Pet section above Account: a `Pet name` field filled with the current name, the hint `Up to 30 characters. Leave blank to use Mochi.`, a `Save name` button, the inline length error, and `Name saved. Your pet is now {name}.` after saving. The Account section shows the signed-in email read-only above Log out (A17). The form is one reusable `PetNameForm` component.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 §9 Settings row and the mockup Settings states.
- **Applies to:** #10, #20.
- **Status:** Decided.

## P7. "Name your pet" on Home belongs to the dashboard

- **Decision:** #10 provides `PetNameForm` and the API; the dashboard (#20, PR #59) places it on Home as the optional "Name your pet" field. Suggested rule for #20: show it while the pet is still named `Mochi` and the account has no Completed or Abandoned session; it never blocks Start focusing.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 US3 puts the field on a new account's dashboard, which #20 builds; adding it to the placeholder Home here would conflict with #59. The PRD does not define "new account", so the rule above is a suggestion for #20.
- **Applies to:** #10, #20.
- **Status:** Decided (placement); rule open for Partner B in #20.

## P8. Reward hints on the Focus setup duration picker

- **Decision:** Each duration card shows `+N coins` and an apple hint calculated from today's progress with `calculateRewards` (`previewDurationRewards`): `+N apple(s)`, `N min toward an apple`, or `Full today`. Under the cards: `{Pet} needs 2 apples to be full today!` `Every 25 minutes of finished focus feeds one apple, and each minute earns a coin.`, or at 2 apples `{Pet} is full today!` `Focus still earns a coin per minute.` Until the pet loads, or if it cannot, the cards show coins only and the summary says `Your pet`. Coins are never described as spendable.
- **Date / decided by:** 2026-11-16, Partner A (`venuschen999`), before user testing ("Option 2" on the design canvas).
- **Why:** First-time users did not know what coins and apples are or how to earn them. The mockup and PRD v2.9 show no hint here, so this adds copy; the reward rules are unchanged (PRD v2.9 §6). Calculating each hint from today's progress keeps "+1 apple" and "+2 apples" true only when finishing really gives them.
- **Applies to:** #72 (`durationPreview`, `DurationPicker`, `FocusSetup`).
- **Status:** Decided.
