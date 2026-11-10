# Session decisions (US5)

Starting a focus session. PRD v2.9 §§5–7; `AGENTS.md` §8 and §9.

## S1. A presence-met session past its end stays Active until rewards exist

- **Decision:** `POST /api/sessions` does not set `COMPLETED` when the presence deadline is strictly after `endTime` and `now` is at or after `endTime`. The existing `ACTIVE` row is unchanged and the response is `409 ACTIVE_SESSION_EXISTS`. Completion and rewards land together in #15.
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Why:** PRD v2.9 §5.3 grants rewards exactly once, in the same conditional update that leaves `ACTIVE`. Marking the session completed with zero coins would make that update miss it.
- **Applies to:** #12 (`sessionService.startSession`); #15 replaces this hold.
- **Status:** Decided.

## S2. A second Active session uses ACTIVE_SESSION_EXISTS

- **Decision:** When the account already has an `ACTIVE` session, including a lost race on `FocusSession_one_active_per_user`, the response is `409` with code `ACTIVE_SESSION_EXISTS` and message `One session at a time`.
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Why:** AGENTS.md §9 names 409 for an active session. The message matches the mockup copy for that conflict.
- **Applies to:** #12 (`errors.ts`, `POST /api/sessions`).
- **Status:** Decided.

## S3. Duration rejection copy

- **Decision:** A duration other than 15, 25, or 50 fails validation with `Choose 15, 25, or 50 minutes.`
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Why:** PRD v2.9 §7 requires a clear rejection and does not supply this sentence. The durations themselves are specified.
- **Applies to:** #12 (`startSessionSchema`).
- **Status:** Decided.

## S4. Reading the Active session waits for #14

- **Decision:** `GET /api/sessions/active` is not part of #12. Issue #14 owns that route, pending team confirmation, because a read must run the shared presence resolver.
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Applies to:** #12, #14.
- **Status:** Decided.
