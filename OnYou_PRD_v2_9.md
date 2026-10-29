# OnYou — Product Requirements Document

Version 2.9 · October 27, 2026 · Web MVP · Draft for team review  
Screen reference: [OnYou_web_mockups.html](OnYou_web_mockups.html) (attached; keep it in the same folder as this PRD)

## 1. Overview

OnYou is a web productivity app in which completing focus sessions cares for a virtual pet. Every account gets a default pet named Mochi. The user names a task, picks 15, 25, or 50 minutes, and starts a trust-based timer. A completed session earns coins and automatically feeds the pet. Giving up earns nothing and plays a brief, playful slap animation.

## 2. Goals

- A new user can start a session without configuring the pet.
- Completed sessions produce clear, persistent rewards.
- The app is a reliable, secure full-stack web application.

## 3. Scope

**In scope:** signup, login, logout; password reset; default pet and naming; task names; 15/25/50-minute timers; automatic coin and food rewards; daily feeding states; paginated session history.

**Out of scope:** spending coins, shops, food inventory, and manual feeding; pet evolution and appearance customization; custom artwork generation; pause/resume; custom durations; app blocking, attention monitoring, and strict focus mode; native mobile apps; email and push notifications other than password-reset email; chat; leaderboards; AI features; social login; avatars and display names; timezone editing; history search and filtering.

## 4. Glossary

| Term | Meaning |
| --- | --- |
| Session | One focus timer. It belongs to the account, not to a tab. Status is Active, Completed, or Abandoned; Completed and Abandoned are final. |
| Scheduled end | `endTime`: the server-recorded start time plus the duration. |
| Heartbeat | A request from an open OnYou tab confirming the user is still present. |
| Presence deadline | The latest accepted heartbeat plus 30 seconds. |
| Feeding minutes | Minutes from completed sessions credited toward apples on the current feeding day (maximum 50). |
| Feeding day | A calendar day in the user's saved timezone. |

## 5. Session rules

These rules are the single source of truth for sessions. User stories refer to them rather than restating them.

### 5.1 One session per account

- An account has at most one Active session across all tabs and devices.
- Every logged-in tab shows the same task, countdown, and outcome. Opening another tab, or logging in on another device, joins the Active session instead of starting a new one.
- All tabs have equal authority: any tab can send heartbeats, give up, or request completion.
- Task name and duration cannot change after start. There is no pause.
- The countdown uses the server's `endTime`, so refreshing restores it.

### 5.2 Presence

- Product intent: at least one OnYou tab stays open until the scheduled end. The MVP approximates this with heartbeats and does not detect tab closure directly.
- Starting a session records the first heartbeat. Each tab sends a heartbeat when it joins and every 10 seconds while the session is Active.
- A heartbeat received before the presence deadline renews it. If the presence deadline passes at or before the scheduled end, the session is Abandoned; later heartbeats cannot revive it.

What this means in practice:

- Refreshing, navigating between OnYou screens, switching tabs or apps, and minimizing do not end a session by themselves, but the presence deadline still applies.
- Closing some tabs is fine while another tab keeps sending heartbeats.
- Any gap of 30 seconds or more with no heartbeat from any tab before the scheduled end abandons the session. This includes closing all tabs, device sleep, and network loss, even if a tab is still open.
- Closing all tabs less than 30 seconds before the scheduled end can still result in completion.
- Closing tabs after a valid completion does not revoke rewards.
- Show a connection warning whenever requests fail.

### 5.3 Outcomes

- A session is **Completed** if it was not abandoned and its presence deadline is strictly later than the scheduled end. Otherwise it is **Abandoned**.
- **Give up** asks for confirmation. Confirming before the scheduled end abandons the session. Confirming after the scheduled end, on a session that met the presence rule, completes it.
- Completion requests before the scheduled end are rejected.
- **Logout during an Active session** asks for confirmation, abandons the session on all tabs and devices, then logs out.
- The server has no running timer. It resolves a session's outcome on the next request of any kind, using stored timestamps and judging against the scheduled end, not the time of the request.
- Final outcomes never change. Rewards are granted exactly once, and retried requests return the stored outcome.

### 5.4 Synchronization

- Heartbeat responses return the authoritative session state. Tabs also refresh state when they regain focus, reconnect, or after a user action.
- Other tabs normally reflect a change within about 10 seconds; browser or network delays can lengthen this. No WebSockets are used.
- The slap animation plays as soon as a tab learns the session was abandoned, or when the user next returns.

## 6. Reward rules

- Only Completed sessions earn rewards. An Abandoned session earns zero coins and zero feeding minutes, however long it ran, and triggers the slap animation. Abandonment never removes rewards already earned.
- **Coins:** one per minute of the session's duration, added to the pet's coin balance. Coins only accumulate in the MVP; spending them is a future feature. Coins never reset and keep increasing after the pet is Full.
- **Feeding minutes:** each completed session adds its duration, capped at 50 per feeding day. Minutes beyond the cap are discarded.
- **Apples:** every 25 feeding minutes gives one apple, up to two per day. Leftover minutes carry over to the next completed session on the same feeding day. Feeding is automatic, with no inventory or feeding button.
- **States:** Starving = 0 apples, Hungry = 1, Full = 2.
- **Daily reset:** at midnight in the user's saved timezone, apples and feeding minutes reset to zero; coins remain. Missed days cause no death, health loss, hunger debt, or other penalty.
- **Day assignment:** a session counts toward the feeding day of its scheduled end, even if it is resolved later. Credit never carries into a later day.
- **Timezone:** captured from the browser at signup and kept fixed.

Example, starting from zero on one feeding day:

| Event | Coins | Feeding minutes | Apples | State |
| --- | --- | --- | --- | --- |
| Complete 15 min | 15 | 15 | 0 | Starving |
| Complete 15 min | 30 | 30 (5 toward next apple) | 1 | Hungry |
| Give up a 25-min session after 10 min (slap) | 30 | 30 | 1 | Hungry |
| Complete 25 min | 55 | 50 (5 discarded by cap) | 2 | Full |

## 7. Input rules

These limits apply to both frontend and backend validation. Input over a limit is rejected with a clear message, never silently truncated.

| Field | Rule |
| --- | --- |
| Email | Required, valid format, unique (case-insensitive), maximum 254 characters |
| Password | 8–15 characters |
| Task name | Trimmed; maximum 80 characters; blank becomes "Focus session" |
| Pet name | Trimmed; maximum 30 characters; blank uses the default name, Mochi |

## 8. User stories

**Main journey:** sign up → meet and optionally name the pet → enter task and duration → start → complete or give up → see result → view feeding progress and history.

### US1 — Account access

As a user, I want to sign up, log in, and log out so that my progress is saved to my account.

- Users can create an account and log in with valid credentials; invalid input shows a clear error (§7).
- Logging out returns the user to the login screen. Logging out during an Active session follows §5.3.
- Logging in restores the pet, coins, today's feeding progress, and any Active session.

### US2 — Reset password

As a user who has forgotten my password, I want to reset it by email so that I can regain access without losing progress.

- The login screen offers Forgot password.
- Submitting an email always shows the same confirmation, whether or not an account exists.
- For an existing account, a single-use reset link is emailed and expires after 30 minutes. Requesting a new link invalidates earlier unused links.
- The new password must follow §7.
- A successful reset signs the user out everywhere and allows login with the new password.
- Expired, used, or invalid links show a clear error and an option to request a new link.
- Requests are rate-limited per email address and per IP address.
- The pet, rewards, and history are unchanged. A reset does not abandon an Active session directly, but signing out stops heartbeats: the session survives only if the user logs in again and a tab sends a heartbeat before the presence deadline.

### US3 — Meet my default pet

As a new user, I want to receive a default pet so that I can start focusing immediately.

- A default pet is created with the account.
- The pet is named Mochi by default. Users can rename it in Settings; a blank name restores Mochi.
- A new account's dashboard offers an optional "Name your pet" field. Naming the pet is not required to start focusing.
- Pet artwork follows the mockup: Mochi's Starving, Hungry, Full, waiting, and slapped visuals are original art drawn in code. Reuse it; do not generate or substitute artwork.

### US4 — View daily feeding progress

As a user, I want to see my pet's feeding status and coins so that I know how my focus has helped.

- The dashboard shows the pet's name, coin balance, today's apples, feeding minutes toward the next apple, and state.
- Each state (Starving, Hungry, Full) has a distinct pet image or animation.
- Feeding, the daily cap, the midnight reset, and sessions that cross midnight behave as in §6.

### US5 — Start a focus session

As a user, I want to name my task, choose a duration, and start a timer so that I can commit to focused work.

- Users enter a task name (blank becomes "Focus session") and choose 15, 25, or 50 minutes.
- Starting shows the task name, countdown, and pet.
- A second tab or device joins the Active session. A new session cannot start while one is Active; any stale session is resolved first.
- Presence, refresh, and multi-tab behavior follow §5.

### US6 — Complete a session and earn rewards

As a user, I want successful sessions to earn food and coins for my pet so that my effort supports it.

- The outcome is decided by §5.3; rewards follow §6.
- The result screen shows the coins, feeding minutes, and apples earned, including when no apple is earned yet and when the pet was already Full.
- Refreshes, retries, and simultaneous requests never duplicate rewards.
- The backend rejects completion before the scheduled end, from an unauthenticated or different user, or for an Abandoned session.

### US7 — Give up on a session

As a user, I want to end a session early so that I can stop when I cannot continue.

- Every tab showing the session offers Give up with a confirmation step; cancelling leaves the timer running.
- The outcome follows §5.3 and applies to all tabs.
- Abandoning plays the slap animation, awards nothing, and leaves existing rewards unchanged.

### US8 — Review focus history

As a user, I want to see my past focus sessions so that I can review my activity over time.

- All Completed and Abandoned sessions are listed, newest first.
- The first 20 are shown; Load more retrieves the next 20 when available.
- Each entry shows task name, date, duration, outcome, and rewards: coins and feeding minutes, or "No rewards" when Abandoned.
- When every session is loaded, Load more is replaced by an end-of-list note.
- Users can see only their own history.
- An empty history shows "No sessions yet" and a Start focusing action.

## 9. Screens

The attached [OnYou_web_mockups.html](OnYou_web_mockups.html) is the reference for layout, copy, and pet art. Open it in any browser to see every screen. OnYou is one responsive web app: every screen is shown in a 1040-pixel desktop browser and on a 390-pixel phone, and the layout adapts below 600 pixels wide. Screens follow the device's light or dark setting and share a top navigation of Home, History, and Settings once logged in. Colors and type are placeholders for the Tailwind theme: pine for actions, apple red for food, plum for giving up and errors.

| Screen | Story | Required content and states |
| --- | --- | --- |
| Sign up | US1 | Email, password with "8 to 15 characters" hint, Create account, link to Log in; field errors for an email already in use and a password outside 8–15 characters |
| Log in | US1, US2 | Email, password, Forgot password?, Log in, link to sign up; one error for a wrong email or password that does not reveal which was wrong; a "Password updated" notice after a reset |
| Forgot password | US2 | Email, Send reset link, Back to log in; an error when reset requests are rate-limited |
| Reset link sent | US2 | Confirmation that does not reveal whether the account exists, notes that the link works once and expires in 30 minutes, Back to log in, Send another link |
| Set new password | US2 | New password with length hint and note that saving signs the user out everywhere; field error for an invalid length |
| Link no longer works | US2 | Explanation for expired, used, or replaced links, Send a new link, Back to log in |
| Dashboard | US3, US4 | Pet in the current state, state label, apples today (0–2), minutes toward the next apple ("Full for today" at the cap), coin balance, status message, Start focusing; optional "Name your pet" field on a new account; loading and "Couldn't load" states with Try again |
| Active session bar | US5 | On every screen other than the timer while a session is Active: task, time left, end time, Return to session; Start focusing is disabled with "One session at a time" |
| Choose task and duration | US5 | Optional task (up to 80 characters), 15/25/50-minute options, guidance to keep at least one OnYou tab open, Start button naming the duration; field error and disabled Start for a task over 80 characters |
| Session running | US5 | Countdown, task name, duration and end time, pet, Give up; shown in every logged-in tab; a connection warning when requests fail |
| Give up confirmation | US7 | States that this session earns nothing and earlier progress is safe, and that it ends the session in every tab; Give up, Keep focusing |
| Session complete | US6 | Task and duration; coins, feeding minutes, and apples earned; status message, including when minutes passed the daily limit, when no apple is earned yet, and when the pet was already Full; Back to dashboard, Start another session |
| Session ended early | US7 | Slap animation; zero coins, feeding minutes, and apples; explains it was given up or no tab was connected for 30 seconds; Back to dashboard |
| History | US8 | Table on desktop and cards on phones: task, date and time, duration, outcome, coins and feeding minutes ("No rewards" when Abandoned); Load more with a loading state; end-of-list note; empty state with Start focusing |
| Settings | US1, US3 | Pet name with hint and Save name, with a length error and a "Name saved" confirmation; account email; Log out with a note that logging out ends an active session |
| Log out confirmation | US1 | Shown when logging out during a session: says it ends the session on every device with no rewards; Log out and end session, Stay logged in |

On phones, dialogs open as bottom sheets, buttons span the screen, the pet preview beside the duration picker is hidden, and inputs use 16-pixel text so the browser does not zoom. Screens may be panels within shared pages; separate page implementations are not required.

## 10. Technical requirements

### Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js (React) + Tailwind CSS |
| Backend | Next.js Route Handlers on Node.js |
| Database | PostgreSQL |
| Authentication | JWT |
| Testing | Unit and integration tests; Playwright for end-to-end |
| API documentation | OpenAPI/Swagger |
| CI/CD | Multi-stage pipeline: PR tests, security scanning, deployment previews, automated production deployment, separate environments |

Specific libraries and hosting belong in the technical specification.

### Security

- Keep database credentials and reward logic on the server.
- Hash passwords with bcrypt. Store reset tokens hashed, never in plain text.
- Include a per-user token version in each JWT, check it on every request, and increment it on password reset.
- Enforce account ownership on every backend endpoint, not only in the interface.
- Assign all session timestamps on the server; never trust times or reward amounts from the browser.
- Store password-reset rate-limit counters in PostgreSQL, since server instances may not share memory.

### Sessions

- Store server-assigned `startTime`, `endTime`, `lastHeartbeatAt`, and status.
- Provide `POST /api/sessions/{id}/heartbeat` with authentication and ownership checks.
- Run one shared resolution routine before every session operation: check the scheduled end before applying a later expiry, and resolve expiry before renewing a heartbeat.
- Enforce one Active session per user with a partial unique index (as a SQL migration if the ORM cannot express it).
- Use transactions and concurrency-safe updates so that concurrent heartbeat, completion, give-up, logout, and start requests cannot overwrite newer state, revive an Abandoned session, or duplicate rewards.
- Model the session lifecycle, rewards, and daily cap as explicit state machines.
- Do not rely on browser unload events to detect that tabs closed.

### Client

- Keep heartbeats running across OnYou screen navigation.
- Prevent overlapping requests within a tab, and ignore stale responses after cleanup or a session change.

### General

- Document the API with OpenAPI/Swagger.
- Provide responsive layouts, labeled inputs, visible focus states, readable contrast, and clear loading, error, and empty states.

## 11. Validation and release

Functional tests must cover:

- **Multiple tabs:** shared display and cross-tab sync; giving up from a second tab; closing the original tab while another stays open; closing all tabs before the end and returning before or after the presence deadline; closing all tabs less than 30 seconds before the end; closing tabs after completion; refresh and internal navigation.
- **Presence boundaries:** a heartbeat just before the deadline renews it; one at or after cannot revive the session; a deadline strictly after the end completes even when resolved later; a deadline at or before the end abandons. Include sleep, network loss, browser restoration, and background-tab delays.
- **Concurrency:** concurrent heartbeats, completion, and give-up requests; duplicate completion requests; resolving a stale Active session before a new start.
- **Authorization:** unauthenticated and early completion attempts; logout during a session; blocked access to another user's history, pet, or rewards.
- **Rewards:** the §6 example sequence; the daily cap; sessions crossing midnight; resolution on a later day.
- **Password reset:** unknown email; expired, reused, and superseded links; sign-out everywhere.
- **Inputs:** every limit in §7.
- **History:** pagination beyond 20 entries.

Release requires a production deployment on which all tests pass.
