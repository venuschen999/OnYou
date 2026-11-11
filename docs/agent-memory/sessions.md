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
- **Status:** Superseded by S7.

## S7. Active session read returns the row or null

- **Decision:** `GET /api/sessions/active` is part of #13 because US5 joins a tab through that route. The caller must be authenticated. The handler runs `resolveSession` before it responds and does not renew `lastHeartbeatAt`. `200` with the `FocusSession` body when an `ACTIVE` row remains, including a presence-met session past `endTime` that #15 has not completed. `200` with JSON `null` when the account has no `ACTIVE` session, including when resolution just abandoned a lapsed one. `401` when the caller is not authenticated. No other account's session is visible.
- **Date / decided by:** 2026-11-09, Partner B (`CollinsCao`).
- **Why:** AGENTS.md §9 lists the route under US5, and the OpenAPI skeleton named `200` and `401` without an empty body. `null` keeps the success status the skeleton already documented. `404` would collide with a missing session id on the other session routes.
- **Applies to:** #13 (`getActiveSession`, `docs/openapi.yaml`).
- **Status:** Decided.

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

## S8. Completion returns stored rewards or a 409

- **Decision:** `POST /api/sessions/{id}/complete` requires the owner. `401` `UNAUTHENTICATED`, `403` `FORBIDDEN`, and `404` `SESSION_NOT_FOUND` match the heartbeat route. Completion before `endTime` is `409` `SESSION_TOO_EARLY` with message `This session has not reached its scheduled end.` and leaves the row `ACTIVE`. A session that presence resolution abandons, or that is already `ABANDONED`, is `409` `SESSION_ABANDONED` with message `This session was abandoned and cannot be completed.` The abandon is committed before that error is returned. A `COMPLETED` session returns `200` with its stored coins, feeding minutes, and apples and does not write again. The request body is ignored. No completion token is issued.
- **Date / decided by:** 2026-11-10, Partner B (`CollinsCao`).
- **Why:** PRD v2.9 §5.3 says retries return the stored outcome and completion before the scheduled end is rejected. The PRD does not supply these 409 sentences. The OpenAPI skeleton grouped every final session into `409`; a completed retry is `200` so another tab can show the same rewards.
- **Applies to:** #15 (`completeSession`, `docs/openapi.yaml`).
- **Status:** Decided.

## S9. Rewards and status commit in one conditional update

- **Decision:** `completeSession` locks the session row, resolves presence, checks `endTime`, checks that the presence deadline is strictly later than `endTime`, then locks the pet row. It sets `COMPLETED` only `WHERE status = 'ACTIVE'`. In that same transaction it increments `Pet.coins` by `coinsEarned` and upserts `DailyFeeding` for `getFeedingDay(endTime, timezone)` to `feedingAfter`. If the conditional update changes no row, the stored final session is returned and balances are not written. A failure after the status write rolls the transaction back, so the session stays `ACTIVE` with no reward change.
- **Date / decided by:** 2026-11-10, Partner B (`CollinsCao`).
- **Why:** PRD v2.9 §5.3 and §10 require exactly-once rewards. Reward decision R2 says #15 stores both the earned amounts and the day's totals.
- **Applies to:** #15 (`completeSession`).
- **Status:** Decided.
