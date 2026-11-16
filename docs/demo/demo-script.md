# 10-minute demo script

This is a plan for a live demonstration of OnYou. **No demo video is stored in this repository, and this file does not claim that one has been recorded.**

Use the production app at https://onyou123.vercel.app or a local server built from `main`. Show only behavior that is merged. Do not demonstrate issue #21 or issue #30 as finished work. #21 is open. #30 is open.

Say the product source is [OnYou_PRD_v2_9.md](../../OnYou_PRD_v2_9.md). Spending coins, shops, pause, custom durations, and social login are out of scope. Do not imply they exist.

## Before you record

A completed focus session cannot finish inside a few minutes unless it was started earlier. The server rejects completion before `endTime`.

About 16 minutes before the recording, on a second account:

1. Sign up through the real signup form.
2. Start a 15-minute session with a task name you can recognize, such as "Demo reading".
3. Leave that tab signed in so heartbeats continue.
4. Wait until the scheduled end has passed and the session can be completed.

You will complete that session on camera. That uses the normal completion path. It does not use a hidden shortcut.

Keep a third account unused so History can show an empty list, or create that account live in section 2 and accept that its history is empty until the prepared account is shown.

Have these pages open in tabs so the recording does not stall on login walls:

- The app
- https://onyou123.vercel.app/docs
- The GitHub Actions tab for `venuschen999/OnYou`
- [docs/diagrams/architecture.md](../diagrams/architecture.md) and [docs/diagrams/database-schema.md](../diagrams/database-schema.md)
- A merged pull request that records a red run, such as #59 or #25
- [docs/sprints/contribution-log.md](../sprints/contribution-log.md)

## 0:00–1:00 Project introduction

Show Home or the login screen.

Say that OnYou turns a focus block into care for one pet. Every account starts with Mochi. A session belongs to the account. Any signed-in tab can heartbeat, give up, or complete. Presence is an HTTP heartbeat every 10 seconds, not a WebSocket.

Name the stack from the README: Next.js 16, React 19, PostgreSQL 16 on Neon, Prisma 7, a JWT in an HttpOnly cookie, Zod, Vitest, Playwright, and Vercel.

Point at the two open issues so the scope is honest: #21 (midnight and late resolution as its own story) and #30 (the accessibility pass).

## 1:00–2:00 Authentication

On a new account, submit signup. Show the password rule if you type fewer than 8 characters: the field error is part of the shipped signup form.

After signup, show that you are signed in and that the pet is Mochi. Open the browser's cookie list and show that `onyou_auth` is HttpOnly. Do not paste the cookie value into the recording.

Say the cookie value is an HS256 JWT signed with `jose`. The subject is the user id and `tv` is `tokenVersion`. Login uses one error for a wrong email or a wrong password.

If time remains, open Forgot password and show the request screen. Say the server returns the same message when the email is unknown, and that confirmation increments `tokenVersion`. Do not read a reset token aloud if a real email arrives.

## 2:00–3:30 Focus sessions

On the new account, open Focus. Enter a task, choose 15, 25, or 50, and start. Show the countdown and the copy that tells the user to keep a signed-in tab connected.

Open the browser network panel and show `POST /api/sessions/{id}/heartbeat` repeating. Say the interval is 10 seconds and the grace period is 30 seconds.

Give up. Confirm in the dialog. Show the abandoned result and that coins, feeding minutes, and apples from that session are zero.

Switch to the prepared account whose 15-minute session has reached its scheduled end. Complete it from the Focus screen. Show the result with the coins and feeding numbers the server returned.

## 3:30–5:00 Pet feeding and rewards

On the prepared account, open Home. Show the pet label (Starving, Hungry, or Full), the apple count, feeding minutes, and coins. Coins stay. Apples and feeding minutes are for the feeding day.

Say a completed session adds its duration in coins. Feeding minutes add the duration, capped at 50 for that feeding day. One apple is 25 minutes, and the day stops at 2 apples. An abandoned session adds nothing. The server computes those numbers. The client does not submit them.

Say the feeding day is the session `endTime` in the timezone saved at signup. The unit tests for that function are in `tests/unit/domain/feedingDay.test.ts`. Issue #21 is still open, so do not describe that issue as accepted.

Open Settings and show the pet name field. Saving a name is shipped (`PATCH /api/pet`). A name over 30 characters is rejected and not truncated. You can skip the save if you want to keep the prepared pet named Mochi.

## 5:00–6:00 History

Open History on the new account if it has no finished sessions, and show the empty state.

Open History on the prepared account. Show the completed session and the abandoned session if you also gave one up there. Show Load more only if that account has more than 20 sessions. Otherwise say the API returns `items` and `nextCursor` with a page size of 20, and that `e2e/full-loop.spec.ts` covers a page past 20. Do not invent extra rows in the database during the talk.

## 6:00–7:00 API and database

Open `/docs` and show the shipped operations: signup, login, logout, both password-reset routes, pet GET and PATCH, session list, active session, heartbeat, complete, and abandon.

Open [the architecture diagram](../diagrams/architecture.md). Walk the path: React UI, `src/lib/api`, Route Handler, JWT check, service, domain rules, Prisma, Neon. Point at Resend as the only email provider, used for password reset.

Open [the schema diagram](../diagrams/database-schema.md). Name `User`, `Pet`, `FocusSession` (including `lastHeartbeatAt`), `DailyFeeding`, `PasswordResetToken`, and `RateLimitCounter`. Mention the partial unique index that allows one `ACTIVE` session per account.

## 7:00–8:00 TDD and automated testing

Open PR #59 or #25 and read the red and green lines that are actually in the pull request. For #59, the red run is `dashboardPage.test.tsx` with 7 failed and 2 passed before Home called `GET /api/pet`.

Say the git history for most feature issues has a `test` commit before the `feat` commit. Name #14 as the exception: implementation commit `11e0378` is before test commit `b6aa61b`. Do not claim every issue followed the same order.

Mention the three test layers that exist on `main`: Vitest unit tests under `tests/unit/`, Vitest integration tests against PostgreSQL 16, and Playwright in `e2e/`. The coverage numbers to quote are the ones written on the merged pulls (PR #59 reports 82.20% lines, domain lines 100%, domain branches 98.88%). Do not invent a newer percentage unless you have just run the command and can show the output.

## 8:00–9:00 CI/CD and deployment

Show `.github/workflows/ci.yml`, `codeql.yml`, and `npm-audit.yml` on GitHub, or the green checks on a merged pull request. Name the jobs: lint and unit tests, coverage, integration tests with PostgreSQL 16, Playwright, CodeQL, and `npm audit`.

Show a Vercel preview check on a pull request and the production deployment of `main`. Open https://onyou123.vercel.app and show the login page. Say production migrations run inside `npm run vercel-build` (`prisma migrate deploy && next build`). Secrets stay in Vercel environment settings. `.env.example` lists names only.

## 9:00–9:30 AI-assisted development

Show `AGENTS.md` and one file under `docs/agent-memory/`. Say pull requests name the assistant they used. PR #59 names Cursor. `docs/agent-memory/auth.md` records one decision as Claude Code, reviewed by Partner A.

Do not mention Antigravity. The repository has no evidence of it.

Say the rules require a failing test before implementation, and that the red/green notes in the pull requests are how that shows up in review.

## 9:30–10:00 Partner contributions

Open [the contribution log](../sprints/contribution-log.md).

Say CollinsCao's merged feature work is the session lifecycle, Focus, the result screen, Home, and History, plus CI, security scanning, OpenAPI, and the deployment pull. venuschen999's merged feature work is the scaffold, schema, auth, rewards, pet rename, Give up, logout, feeding progress, password reset, and the Playwright smoke job.

Say both people still need to confirm the log. Say #21 and #30 are venuschen999's open issues. Say formal GitHub reviews are fewer than the project rules ask for, and point at the review table in the log instead of describing reviews that are not there.

Stop at 10:00. Do not start a second feature tour.
