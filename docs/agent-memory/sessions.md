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

## S4. Reading the Active session waits for confirmation

- **Decision:** `GET /api/sessions/active` is not part of #12. It is also not part of #14 until the team confirms it. Issue #14's acceptance criteria do not list the route. A later implementation must run the shared presence resolver before returning the account's Active session.
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Applies to:** #12, #14.
- **Status:** Open. Proposed contract is in the #14 work notes; the route is not implemented.

## S5. Heartbeat does not mark a presence-met session Completed

- **Decision:** `POST /api/sessions/{id}/heartbeat` renews `lastHeartbeatAt` only when `planSessionResolution` returns `RENEW`, and abandons only when it returns `ABANDON`. `HOLD` leaves the row `ACTIVE` with its stored rewards at zero. The endpoint returns that stored state with `200`, including a session that is already `ABANDONED` or `COMPLETED`. It does not return `409` for a final session.
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Why:** PRD v2.9 §5.3 grants rewards in the same conditional update that leaves `ACTIVE`. Issue #11's reward functions are not on this branch, and #15 owns that update. Writing `COMPLETED` with zero rewards would make the later update miss the row.
- **Applies to:** #14 (`resolveSession`, `heartbeatSession`); #15 replaces the hold.
- **Status:** Decided.

## S6. Heartbeat errors for a missing or unowned session

- **Decision:** An unknown session id returns `404` `SESSION_NOT_FOUND` with message `No session exists with that id.` A session owned by another account returns `403` `FORBIDDEN` with message `That session belongs to another account.`
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Why:** AGENTS.md §9 assigns 404 to a missing resource and 403 to a different owner. The PRD does not supply these sentences.
- **Applies to:** #14 (`heartbeatSession`, `docs/openapi.yaml`).
- **Status:** Decided.
