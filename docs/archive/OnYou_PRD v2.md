# OnYou — Product Requirements Document

Version: 2.0 · October 27, 2026  
Scope: Web MVP · Eight user stories  
Status: Draft for team review

## 1. Product overview

OnYou is a productivity app where completing focus sessions cares for a virtual pet. Everyone receives a default pet. Users name a task, choose a duration, and let a trust-based timer run. Successful sessions earn coins and automatically provide food for the pet. Giving up earns nothing, and the pet receives a brief, playful slap animation.

Coins accumulate for a later design in which they are used to buy food. Spending coins is out of scope for this MVP.

Partner connections, in which two users adopt each other and care for one another through their focus, are planned for a later release and are not part of this MVP.

## 2. Problem and target users

Students and other people doing self-directed work can struggle to follow through on planned focus time. A countdown alone may offer little emotional motivation. OnYou aims to make those commitments feel meaningful by connecting progress to a companion that depends on the user.

Primary users are students who want lightweight motivation while studying or working.

This problem statement is a product hypothesis, not a claim of completed user validation. The MVP should test whether caring for a pet motivates users to complete and repeat sessions.

## 3. Goals and scope

### Goals

- Let a new user begin a session without configuring a pet.
- Make successful focus produce clear, persistent rewards.
- Deliver a reliable, secure full-stack web application.

### In scope

- Accounts
- Password reset
- Default pet and naming
- Task names
- 15/25/50-minute timers
- Automatic food and coin rewards
- Daily feeding states
- Paginated session history

### Out of scope

- Partner connections, invite codes, mutual care, and partner reminders (planned for a later release)
- User avatars and display names
- Native mobile apps
- App blocking, attention monitoring, and strict focus mode
- Pause/resume
- Custom timer lengths
- Chat
- Email and push notifications
- Shops and spending coins
- Food inventory and manual feeding
- Pet evolution and pet appearance customization
- Custom artwork generation
- Leaderboards
- AI features
- Social login
- Timezone editing
- History search/filtering

## 4. Core product rules

### Pet

- Every account has one default pet, created automatically at signup.
- The pet is the only recipient of rewards in this MVP.

### Trust-based focus

- Starting a session gives the starting tab a random session token, kept only in that tab's `sessionStorage`. The token survives a refresh and is erased when the tab or browser is closed.
- A successful session reaches its recorded end time without the user giving up, and the tab holding the token then reports completion. The server accepts completion only with a valid token and only after the end time.
- Refreshing the page has no effect: the token remains, and the countdown resumes from the saved end time.
- Switching tabs, switching to other apps, minimizing the browser, laptop sleep, and network drops do not fail the session while the starting tab stays open. Completion is reported once the tab can reach the server again.
- Closing the tab or browser fails the session, because the token is lost and the session can no longer be completed.
- Opening OnYou without the token (a new tab, another device, or a tab reopened after closing) during an active session shows that the session is running in another tab or was closed, with a Give up option. It cannot complete the session.
- Opening OnYou without the token after the end time, when the session was not completed, resolves it as Abandoned. Abandoned sessions award nothing, and the slap animation is shown at that moment.
- Browsers that restore a closed tab may also restore its token; that tab can still complete the session. This is accepted under the trust-based model.
- Rewards for a completed session are resolved exactly once, regardless of refreshes, retries, or multiple open tabs.
- No activity or attention verification is claimed. The backend validates elapsed time and session state, not whether the person worked.
- Each user can have only one active session. No pause/resume is included.
- Session states are Active, Completed, and Abandoned. A completed or abandoned session cannot change outcome.

### Coins and feeding

| Rule | Behavior |
| --- | --- |
| Coins | A successful session gives the pet one coin per minute of its duration. |
| Coin use | Coins only accumulate in the MVP; using them to buy food is a future feature. |
| Apples | Every 25 credited minutes gives the pet one apple, up to two per day. |
| Partial progress | Carries between successful sessions within the same feeding day. |
| Feeding | Automatic; no inventory or feeding button. |
| States | Starving = 0 apples; Hungry = 1; Full = 2. |
| Full pet | Continues earning coins; daily feeding credit is capped at 50 minutes. |
| Giving up | No coins, apples, or partial credit; the pet receives a brief slap animation. |
| Existing progress | Never removed by a failed session. |
| Daily reset | Apples and partial progress reset; coins remain. |
| Missed days | No death, health loss, hunger debt, or accumulated penalties. |

Example: A successful 15-minute session followed by a successful 10-minute session provides one apple and 25 coins. Another 25-minute session makes the pet full.

The pet's feeding day follows the user's saved timezone. Sessions count on their scheduled completion date in that timezone, even if rewards are processed later. Past food credit must not become food for a later day. The MVP captures the browser timezone at signup and keeps it fixed.

### Input rules

Proposed limits; confirm before implementation, since validation behavior depends on them.

| Field | Rule |
| --- | --- |
| Email | Required, valid format, unique (case-insensitive), maximum 254 characters |
| Password | 8–15 characters |
| Task name | Trimmed; maximum 80 characters; blank becomes "Focus session" |
| Pet name | Trimmed; maximum 30 characters; blank uses the default pet name |

Inputs exceeding a limit are rejected with a clear message; they are not silently truncated.

## 5. Main user journeys

### Focus

Sign up → meet/name default pet → enter task and choose duration → start session → complete or give up → see result → view feeding progress and history.

### Account recovery

Forgot password → enter email → open emailed link → set new password → log in.

## 6. User stories

### Accounts

#### US1 — Account access

As a user, I want to sign up, log in, and log out so that my progress is saved to my account.

Acceptance criteria:

- Users can create an account and log in with valid credentials.
- Invalid submissions display a clear error, following the input rules.
- Logging out returns the user to the login screen.
- Logging back in restores the user's pet, coins, daily feeding progress, and session state.
- Logging out during an active session asks for confirmation, erases the session token, and abandons the session.

#### US2 — Reset my password

As a user who has forgotten my password, I want to reset it by email so that I can regain access without losing progress.

Acceptance criteria:

- The login screen offers Forgot password.
- Submitting an email always shows the same confirmation message, whether or not an account exists.
- If the account exists, a reset link is emailed. The link is single-use and expires after 30 minutes.
- Requesting a new link invalidates earlier unused links.
- The new password must follow the same rules as signup.
- A successful reset signs the user out of all existing sessions and allows login with the new password.
- Expired, used, or invalid links show a clear error and an option to request a new link.
- Reset requests are rate-limited per email address and per IP address.
- Resetting a password does not change the pet, rewards, history, or an active focus session.

### Pet

#### US3 — Meet my default pet

As a new user, I want to receive a default pet so that I can start focusing immediately.

Acceptance criteria:

- A default pet is created automatically with the account.
- Users can name and rename the pet; a blank name uses a default.
- Naming the pet is not a prerequisite for focusing.

#### US4 — View daily feeding progress

As a user, I want to see my pet's feeding status and coins so that I know how my focus has helped.

Acceptance criteria:

- The dashboard shows the pet's name, coin balance, today's apples, and partial progress toward the next apple.
- It displays Starving, Hungry, or Full according to the feeding rules, with a distinct pet image or animation for each state.
- Feeding is automatic and capped at two apples per day; coins continue increasing after Full.
- Feeding progress resets at midnight in the user's saved timezone; coins persist.
- Missing days creates no additional penalties.
- Sessions crossing midnight count on their scheduled completion day.

### Focus sessions

#### US5 — Start a focus session

As a user, I want to name my task, choose a duration, and start a timer so that I can commit to focused work.

Acceptance criteria:

- Users can enter a task name; blank names default to "Focus session."
- Available durations are 15, 25, and 50 minutes.
- Starting displays the task name, countdown, and pet.
- Only one active session is allowed per user, including across tabs or devices.
- Task name and duration cannot change after starting.
- Starting stores a session token in the starting tab's `sessionStorage`.
- Refreshing restores the countdown from the saved end time and does not affect the session.
- Switching tabs, switching apps, and minimizing do not fail the session while the page stays open.
- Laptop sleep and network drops do not fail the session while the starting tab stays open.
- Closing the tab or browser fails the session.
- Navigating between OnYou screens in the starting tab does not fail the session.
- Opening OnYou in another tab or device during the session shows "Session running in another tab or closed" with a Give up option; it cannot complete the session.
- Opening OnYou without the token after the end time resolves an uncompleted session as Abandoned.

#### US6 — Complete a session and earn rewards

As a user, I want successful sessions to earn food and coins for my pet so that my effort supports it.

Acceptance criteria:

- A session succeeds at its recorded end time unless abandoned beforehand.
- The pet receives one coin per minute of the session's duration.
- The pet receives feeding-minute credit under the 25-minute apple and two-apple daily rules.
- Partial credit carries between successful sessions within the same feeding day.
- A 15-minute success plus a 10-minute success earns one apple and 25 coins for a pet starting at zero.
- The result screen shows the coins and feeding credit earned.
- Refreshes, retries, or simultaneous requests cannot duplicate rewards.
- The backend rejects attempts to claim completion before the recorded end time or without a valid session token.
- Delayed resolution uses the scheduled completion date for daily feeding credit.

#### US7 — Give up on a session

As a user, I want to end a session early so that I can stop when I cannot continue.

Acceptance criteria:

- An active session offers Give up and asks for confirmation.
- Confirming before the end abandons the session and shows a brief animation of the pet being slapped.
- Abandoned sessions award zero coins, apples, and feeding-minute credit.
- Existing rewards remain unchanged.
- Cancelling confirmation leaves the timer running.
- If the end time has already passed, the session resolves as completed rather than abandoned.

### History

#### US8 — Review focus history

As a user, I want to see my past focus sessions so that I can review my activity over time.

Acceptance criteria:

- All completed and abandoned sessions remain accessible, newest first.
- Initially display up to 20 sessions; Load more retrieves the next 20 when available.
- Each entry shows task name, date, duration, outcome, and awarded rewards.
- Abandoned sessions show zero rewards.
- Users can access only their own history.
- An empty history shows "No sessions yet" and a Start focusing action.

## 7. Screens

| Screen | Required content |
| --- | --- |
| Authentication | Signup, login, forgot password, reset password, validation errors |
| Dashboard | Pet with state image or animation, feeding progress, coins, start action |
| Focus | Task input, duration selection, active countdown, pet, Give up confirmation, result |
| History | Session entries, empty state, Load more |
| Settings | Pet name, logout |

These may be panels within shared pages; five separate page implementations are not required.

## 8. Technical requirements

### Tech stack

| Area | OnYou tech stack |
| --- | --- |
| Language | TypeScript |
| Frontend | Next.js (React) |
| Styling | Tailwind CSS |
| Backend | Next.js Route Handlers on the Node.js runtime (not Edge) |
| Database | PostgreSQL |
| Managed database | Neon, with a database branch per preview deployment |
| Database access | Prisma |
| Authentication | Email/password + JWT (`jose`), stored in an HttpOnly, Secure, SameSite=Lax cookie |
| Password hashing | bcrypt |
| Input validation | Zod, with schemas shared between forms and route handlers |
| Email | Resend, for password-reset links |
| Session tab detection | Per-session token in `sessionStorage`; no heartbeat or WebSockets |
| Unit/integration tests | Vitest, with integration tests against a real PostgreSQL database |
| End-to-end tests | Playwright |
| API documentation | Hand-written OpenAPI file served through Swagger UI |
| Linting/formatting | ESLint and Prettier |
| Security scanning | CodeQL, `npm audit`, and Dependabot |
| CI/CD | GitHub Actions |
| Hosting | Vercel, with a preview deployment per pull request |

### Requirements

- Keep database credentials and reward logic on the server.
- Hash passwords with bcrypt. Store reset tokens hashed, never in plain text.
- Invalidate existing JWTs after a password reset with a per-user token version included in the JWT and checked on each request.
- Enforce one active session per user with a partial unique index in PostgreSQL, written as a SQL migration if Prisma cannot express it.
- Enforce account ownership on backend endpoints, not only in the interface.
- Save authoritative session start/end times on the backend; do not trust browser-submitted reward amounts.
- Generate session tokens on the server with a secure random source, store only their hash, and require the token for completion. Do not rely on browser unload events, since browsers cannot reliably distinguish a refresh from a close.
- Apply session transitions and rewards in database transactions to avoid partial or duplicate outcomes.
- Store password-reset rate-limit counters in PostgreSQL, since server instances may not share memory.
- A timer does not require a continuously running server countdown; store timestamps and resolve state reliably when queried.
- Treat session lifecycle, rewards, and daily caps as explicit state machines with defined transitions.
- Expose a public API documented with OpenAPI/Swagger.
- Provide responsive layouts, labeled inputs, visible focus states, readable contrast, and clear loading/error/empty states.

## 9. Validation and release criteria

Functional validation must cover:

- Session success, early abandonment, refresh during a session, closing during a session, opening a second tab during a session, opening without the token after the end time, completion attempts without a valid token or before the end time, logout during a session, and duplicate completion requests.
- Partial apple accumulation, daily cap, midnight crossing, and resolution on a later day.
- Password reset: unknown email, expired link, reused link, superseded link, and sign-out of existing sessions.
- Input limits for every field in the input rules.
- Blocked unauthorized access to another user's history, pet, or rewards.
- Pagination of history beyond 20 entries.

Release requires a production deployment on which all validation cases pass.

Product evaluation should observe whether a new user can start without assistance, understands what their focus earns the pet, and returns for additional sessions. These are proposed learning measures, not validated adoption targets. A separate analytics system is not required for the MVP.

## 10. Decisions and assumptions

- Confirmed: default pet for everyone, automatic care for the pet, daily two-apple goal, trust-based timer with session tokens, paginated history of all sessions, eight user stories, partner features deferred to a later release, and the tech stack in Section 8.
- Recommended but not yet confirmed: browser-derived fixed account timezone and the input limits in Section 4.
- To finalize during planning: exact pet artwork for each state and account deletion behavior.
- All reward calculations use the duration of successful sessions; abandoned sessions contribute zero minutes.
