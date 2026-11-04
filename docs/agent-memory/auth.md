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

## A8. Auth screens and protected routes (#9)

Decided 2026-11-03 by Partner A (`venuschen999`) while planning #9. All are **Decided**.

- **A8.1 No Forgot password link yet.** The login screen omits "Forgot password?" until #24/#25 build the page; #24 adds the link. *Why:* no dead links in Sprint 1.
- **A8.2 Placeholder app pages.** Home at `/dashboard` (`src/app/(app)/dashboard`), History at `/history`, Settings at `/settings`, each with only the app header, one `h1`, and loading/error states. `/` redirects to `/dashboard`. Features arrive in #20, #23, #10. *Why:* the redirect target and nav links must exist; no feature stubs.
- **A8.3 Signed-in users skip auth screens.** A user with a valid session who opens `/login` or `/signup` is redirected to `/dashboard`.
- **A8.4 Logout is not in #9.** No logout endpoint or button until #18. *Why:* stay in scope.
- **A8.5 Validate on submit.** Forms validate with the shared Zod schemas when submitted, show every field error at once, and clear a field's error when that field is edited.
- **A8.6 Loading and error copy** (not in the mockup): submit buttons read "Creating account…" / "Logging in…", are disabled, and show a spinner while waiting. Network or 5xx failures show "Something went wrong. Try again."
- **A8.7 Redirect is tested at the server level first.** Integration tests cover the proxy and server auth helper; a Playwright test is added with #6 (`TODO(#6)`).

## A9. Two-layer route protection

- **Decision:** `src/proxy.ts` (Next 16's renamed middleware) runs an *optimistic* check on app routes: if the auth cookie is missing or its JWT signature/expiry is invalid, it returns a 307 redirect to `/login`. It never queries the database. The `(app)` layout then runs the *full* check (JWT plus `tokenVersion` against the database) behind `<Suspense>` and redirects to `/login` if that fails.
- **Why:** Next.js docs say Proxy must not hit the database (it runs on every route, including prefetches). With `cacheComponents`, reading cookies in a layout must sit behind `<Suspense>`, so the proxy gives a clean redirect before any HTML. The full check catches a password reset (`tokenVersion` changed).
- **Loop guard:** The proxy does **not** redirect signed-in users away from `/login`; the login and signup pages do that with the full check (A8.3). Otherwise a stale-version token would bounce between `/login` and `/dashboard`.
- **Date / decided by:** 2026-11-03, implementation choice within A7/A8 (Claude Code), reviewed by Partner A.
- **Status:** Decided.
