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
