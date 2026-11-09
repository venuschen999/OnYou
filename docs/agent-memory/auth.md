# Auth decisions (US1)

Signup, login, JWT cookie, and timezone capture. PRD v2.9 US1, §7, §10 Security; `AGENTS.md` §8, §12.

## A1. JWT lifetime is 7 days, fixed

- **Decision:** The auth JWT `exp` and the cookie `Max-Age` are both 7 days, held in one constant `AUTH_TOKEN_TTL_SECONDS`. No sliding renewal: requests do not re-issue the cookie.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** The stack has a single cookie and no refresh token (AGENTS §2, §12). A short expiry would cause `401` heartbeats mid-session, and 30 s without a heartbeat abandons the session. Revocation does not depend on expiry: `tokenVersion` is checked on every request and logout clears the cookie. The data is low-sensitivity.
- **Known edge case:** A session running when the 7 days run out is abandoned. Sliding renewal (e.g. re-issuing the cookie on heartbeat) would fix it but is new behavior; not implemented unless a follow-up issue is filed.
- **Applies to:** #8 (`src/lib/server/authToken.ts`), #9.
- **Status:** Decided.

## A2. Signup timezone falls back to Pacific time

- **Decision:** If signup has a missing or invalid IANA `timezone` (not accepted by `Intl.DateTimeFormat`), store `America/Los_Angeles` instead of rejecting the request. A valid value is stored as sent. The constant is `DEFAULT_TIMEZONE`.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** Signup should not fail over a browser detail the user cannot see or fix. The timezone is captured once and never editable (PRD v2.9 §6), so the request must still succeed.
- **Assumption to confirm:** The fallback covers both *missing* and *invalid* values.
- **Applies to:** #8 (`src/lib/validation/auth.ts`, `authService.signUp`).
- **Status:** Decided.

## A3. Timezone is written only at signup

- **Decision:** Only signup writes `User.timezone`. Login ignores any `timezone` field, and no endpoint updates it.
- **Date / decided by:** From PRD v2.9 §3 and §6 ("captured from the browser at signup and kept fixed"; timezone editing out of scope).
- **Applies to:** #8 and all later endpoints.
- **Status:** Decided.

## A4. Emails are trimmed and stored lowercase

- **Decision:** Signup and login trim the email and convert it to lowercase before validating its length, storing it, or looking it up. Uniqueness is still enforced by the `LOWER(email)` unique index from #5. A duplicate returns `409 EMAIL_IN_USE`.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** PRD v2.9 §7 makes email unique case-insensitively. Normalizing once keeps lookups simple (`findFirst` on the stored value) and matches the #5 index.
- **Applies to:** #8 (`emailSchema`), #24 (password-reset lookup).
- **Status:** Decided.

## A5. Login errors do not reveal which field was wrong

- **Decision:** Unknown email and wrong password both return the same `401 INVALID_CREDENTIALS` body with "Email or password is incorrect. Check both and try again." (mockup). When the email is unknown, a bcrypt comparison against a dummy hash still runs, so timing does not reveal whether the account exists.
- **Date / decided by:** From PRD v2.9 §9 (Log in screen) and the mockup.
- **Applies to:** #8.
- **Status:** Decided.

## A6. #8 creates a minimal `docs/openapi.yaml`

- **Decision:** #8 creates `docs/openapi.yaml` (OpenAPI 3.1) documenting only `POST /api/auth/signup`, `POST /api/auth/login`, and the shared error schema. #7 adds Swagger UI and builds on this file instead of creating it.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** AGENTS §9 requires endpoint changes to update `docs/openapi.yaml` in the same PR; #7 was not done yet.
- **Applies to:** #8, #7.
- **Status:** Decided.

## A7. #8 builds the per-request auth check; #9 wires it into routes

- **Decision:** #8 implements and tests `getAuthenticatedUser(request)`: read the cookie, verify signature and expiry, load the user, and reject when the token's `tokenVersion` differs from the stored one. #9 uses it to protect pages and later endpoints use it in handlers.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** Signing and verifying live in the same module; later endpoints (#10, #12, #14) need the check without waiting for #9.
- **Applies to:** #8 (`src/lib/server/auth.ts`), #9 and every authenticated endpoint.
- **Status:** Decided.
