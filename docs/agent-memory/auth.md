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

- **A8.1 No Forgot password link yet.** The login screen omits "Forgot password?" until the page exists. *Why:* no dead links in Sprint 1. *Superseded by A16 (2026-11-15): #24 became API-only, so #25 adds the link with the page.*
- **A8.2 Placeholder app pages.** Home at `/dashboard` (`src/app/(app)/dashboard`), History at `/history`, Settings at `/settings`, each with only the app header, one `h1`, and loading/error states. `/` redirects to `/dashboard`. Features arrive in #20, #23, #10. *Why:* the redirect target and nav links must exist; no feature stubs.
- **A8.3 Signed-in users skip auth screens.** A user with a valid session who opens `/login` or `/signup` is redirected to `/dashboard`.
- **A8.4 Logout is not in #9.** No logout endpoint or button until #18. *Why:* stay in scope.
- **A8.5 Validate on submit.** Forms validate with the shared Zod schemas when submitted, show every field error at once, and clear a field's error when that field is edited.
- **A8.6 Loading and error copy** (not in the mockup): submit buttons read "Creating account…" / "Logging in…", are disabled, and show a spinner while waiting. Network or 5xx failures show "Something went wrong. Try again."
- **A8.7 Redirect is tested at the server level first.** Integration tests cover the proxy and server auth helper; the Playwright smoke test in `e2e/smoke.spec.ts` (#6) checks that a signed-out browser opening `/dashboard` lands on `/login`.

## A9. Two-layer route protection

- **Decision:** `src/proxy.ts` (Next 16's renamed middleware) runs an *optimistic* check on app routes: if the auth cookie is missing or its JWT signature/expiry is invalid, it returns a 307 redirect to `/login`. It never queries the database. The `(app)` layout then runs the *full* check (JWT plus `tokenVersion` against the database) behind `<Suspense>` and redirects to `/login` if that fails.
- **Why:** Next.js docs say Proxy must not hit the database (it runs on every route, including prefetches). With `cacheComponents`, reading cookies in a layout must sit behind `<Suspense>`, so the proxy gives a clean redirect before any HTML. The full check catches a password reset (`tokenVersion` changed).
- **Loop guard:** The proxy does **not** redirect signed-in users away from `/login`; the login and signup pages do that with the full check (A8.3). Otherwise a stale-version token would bounce between `/login` and `/dashboard`.
- **Date / decided by:** 2026-11-03, implementation choice within A7/A8 (Claude Code), reviewed by Partner A.
- **Status:** Decided.

## A10. Password-reset rate limits

- **Decision:** `POST /api/auth/password-reset/request` allows 3 requests per email and 10 per IP address in each fixed 15-minute window. Counters live in the PostgreSQL table `RateLimitCounter`, keyed by a SHA-256 hash of the lowercased email or by the IP from the first `x-forwarded-for` entry (`unknown` when absent). The email limit applies whether or not an account exists. Over a limit returns `429` `TOO_MANY_REQUESTS` with the mockup copy `Too many reset requests. Wait a few minutes, then try again.`
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 US2 and §10 require per-email and per-IP limits in PostgreSQL but give no numbers. Counting unknown emails too keeps the limit from revealing which accounts exist. Hashing the email keeps addresses out of the counter table.
- **Applies to:** #24.
- **Status:** Decided.

## A11. Reset request response is identical for every email

- **Decision:** Every accepted request returns `200` with `{ "message": "If an account exists for that email, a reset link is on its way." }`, including unknown emails and a failed Resend call (the failure is logged without the token or link). An invalid email is `400` `VALIDATION_ERROR`.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 US2 and AGENTS.md §12: unknown emails get the same response. A different status on a send failure would reveal that the account exists.
- **Applies to:** #24, #25 (Check your email screen).
- **Status:** Decided.

## A12. Reset tokens and the reset email

- **Decision:** A token is 32 bytes from `crypto.randomBytes`, sent as 64 hex characters. `PasswordResetToken` stores only its SHA-256 hash, `expiresAt` 30 minutes after creation, and `usedAt`. A new request deletes the user's other unused tokens. The email goes only through Resend (`fetch` to its API, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Subject: `Reset your OnYou password`. Text: `Someone asked to reset the password for your OnYou account. Open this link to choose a new password: {link} The link works once and expires in 30 minutes. If you didn't ask for this, ignore this email; your password stays the same.`
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** AGENTS.md §12 (random, hashed, single-use, 30 minutes, newer request invalidates older). The token has 256 bits of entropy, so a fast hash is enough; #25 compares hashes in constant time. AGENTS.md §11 prefers `fetch` over a new SDK.
- **Applies to:** #24, #25 (confirm).
- **Status:** Decided.

## A13. Reset links use a configured base URL

- **Decision:** The link is `{base}/reset-password?token={token}`. The base is `APP_URL` without a trailing slash, or `https://{VERCEL_URL}` on Vercel previews. The request `Host` header is never used.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** A forged `Host` header could make the server email a link to an attacker's site. #25 builds the `/reset-password` page.
- **Applies to:** #24, #25.
- **Status:** Decided.

## A14. Invalid reset links share one error, checked on submit

- **Decision:** `POST /api/auth/password-reset/confirm` returns `400` `RESET_LINK_INVALID` with message `This link no longer works.` for a used, expired, unknown, or missing token, without saying which. The token is checked when the new password is submitted; there is no separate link-check endpoint. `/reset-password` with no `token` shows the "This link no longer works" screen at once.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 US2 needs a clear error and a way to request a new link, not the reason. AGENTS.md §9 lists only `request` and `confirm` for US2.
- **Applies to:** #25.
- **Status:** Decided.

## A15. A successful reset signs out everywhere and returns to login

- **Decision:** In one transaction the confirm handler stores the new bcrypt hash, increments `tokenVersion`, sets `usedAt` on the token, and deletes the user's other unused tokens. It does not change any `FocusSession`. The response clears this browser's auth cookie, and the screen goes to `/login?reset=done`, which shows `Password updated. Log in with your new password.`
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 US2 and AGENTS.md §12 (tokenVersion signs out every session; the reset handler does not abandon an Active session). Mockup "Password updated" login state.
- **Applies to:** #25.
- **Status:** Decided.

## A16. The Forgot password link arrives with its page

- **Decision:** The login form shows `Forgot password?` linking to `/forgot-password`, added in #25 together with that page.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** Supersedes A8.1's "#24 adds the link": #24 became API-only, and a link before its page would be dead.
- **Applies to:** #25 (`AuthForm`).

## A17. Logout signs out this browser, from Settings

- **Decision:** `POST /api/auth/logout` requires a signed-in caller (`401` otherwise), ends the Active session (sessions.md S12), clears this browser's auth cookie, and returns `200 { "message": "Logged out." }`. Other devices stay signed in; their session view ends on the next heartbeat. The Settings page gets an Account section with `Log out` and the hint `Logging out during a session ends that session.`; the pet name and email stay with #10. With a running session, `Log out` opens the confirmation: `Log out and end this session?` / `“{task}” is still running. Logging out ends it on every device, and Mochi gets nothing from it.` / `Log out and end session`, `Stay logged in`. Without one, it logs out at once. Either way the browser goes to `/login`.
- **Date / decided by:** 2026-11-15, Partner A (`venuschen999`).
- **Why:** PRD v2.9 US1 and §9 (Settings and Log out confirmation rows); mockup copy. Signing out every device is what password reset does (A15).
- **Applies to:** #18, #10.
- **Status:** Decided.
