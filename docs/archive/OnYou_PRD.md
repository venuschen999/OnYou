# OnYou — Product Requirements Document

Version: 1.0 · October 27, 2026  
Scope: Web MVP · Two developers · Two sprints  
Status: Draft for team review

## 1. Product overview

OnYou is a social productivity app where completing focus sessions cares for a virtual pet and, optionally, a partner’s avatar. Everyone receives a default pet. Users name a task, choose a duration, and let a trust-based timer run. Successful sessions earn coins and automatically provide food. Giving up earns nothing and triggers a brief playful slap animation.

The product’s central idea is mutual care: your focus benefits your partner, and your partner’s focus benefits you.

## 2. Problem and target users

Students and other people doing self-directed work can struggle to follow through on planned focus time. A countdown alone may offer little emotional motivation. OnYou aims to make those commitments feel meaningful by connecting progress to a companion and another person.

Primary users are students and friends or couples who want lightweight accountability while studying or working. Solo users must receive a complete experience without inviting anyone.

This problem statement is a product hypothesis, not a claim of completed user validation. The MVP should test whether caring for dependents motivates users to complete and repeat sessions.

## 3. Goals and scope

### Goals

- Let a new user begin a session without finding a partner or configuring a pet.
- Make successful focus produce clear, persistent rewards.
- Support mutual accountability through one optional partner.
- Deliver a reliable full-stack application with the required engineering evidence.

### In scope

Accounts; default pet and naming; task names; 15/25/50-minute timers; automatic food and coin rewards; daily feeding states; complete paginated session history; preset user avatars; invite codes; partner requests; mutual connections; disconnection; care given and received.

### Out of scope

Native mobile apps, app blocking, attention monitoring, strict focus mode, pause/resume, custom timer lengths, chat, notifications, live partner updates, multiple partners, shops, spending coins, food inventory, manual feeding, pet evolution, custom artwork generation, leaderboards, AI features, and history search/filtering. Preset user-avatar selection is included; pet appearance customization is not.

## 4. Core product rules

### Dependents and direction of care

- Every account has one default pet, which remains after connecting or disconnecting a partner.
- Each user can have at most one partner. A connection is mutual and requires acceptance.
- Solo focus cares for the user’s pet. Connected focus cares for the user’s pet and the partner’s avatar automatically.
- Alice’s focus feeds Alice’s pet and Bob’s avatar. Bob’s focus feeds Bob’s pet and Alice’s avatar. Alice does not feed Bob’s pet.
- The recipient avatar owns its balances; both users see the same underlying values.
- Dependents are recorded when a session starts. Connection changes affect subsequent sessions, including when disconnection happens during an active session.

### Trust-based focus

- A successful session reaches its recorded end time without the user giving up beforehand.
- Switching tabs, minimizing, refreshing, navigating away, or closing the app does not cause failure.
- Reopening before the end restores the remaining time. Reopening after the end shows completion and resolves any pending rewards exactly once.
- No activity or attention verification is claimed. The backend validates elapsed time and session state, not whether the person worked.
- Each user can have only one active session. No pause/resume is included.
- Session states are Active, Completed, and Abandoned. A completed or abandoned session cannot change outcome.

### Coins and feeding

| Rule | Behavior |
| --- | --- |
| Coins | Each successful planned minute gives each recorded dependent one coin. |
| Apples | Each 25 successful minutes gives each dependent one apple, up to two per day. |
| Partial progress | Carries between successful sessions within the same feeding day. |
| Feeding | Automatic; no inventory or feeding button. |
| States | Hungry = 0 apples; Peckish = 1; Full = 2. |
| Full dependents | Continue earning coins; daily feeding credit is capped at 50 minutes. |
| Giving up | No coins, apples, or partial credit; brief slap animation. |
| Existing progress | Never removed by a failed session. |
| Daily reset | Apples and partial progress reset; coins remain. |
| Missed days | No death, health loss, hunger debt, or accumulated penalties. |

Example: A successful 15-minute session followed by a 10-minute session provides one apple and 25 coins to each dependent. Another 25-minute session makes them full. Each dependent can begin with different feeding progress, so identical minute credit may produce different visible apple increments.

Each dependent’s feeding day follows its owner’s saved timezone. Sessions count on their scheduled completion date in that timezone, even if rewards are processed when the app is reopened later. Past food credit must not become food for the reopening day. The MVP can capture the browser timezone at signup and keep it fixed; timezone editing is outside scope.

### Partner requests

- Users exchange unique invite codes outside OnYou.
- A valid code previews the recipient’s display name and avatar before sending.
- One outgoing pending request is allowed per user; multiple incoming requests may be listed.
- Self-requests, duplicate pending pairs, and requests involving an already connected user are blocked.
- A recipient accepts or declines; a sender can cancel.
- Acceptance creates the mutual connection and closes other pending requests involving either person.
- Pending requests have no effect on dependents or rewards.
- Either person may disconnect after confirmation, without the other’s approval.

## 5. Main user journeys

### Solo focus

Sign up → meet/name default pet → enter task and choose duration → start session → complete or give up → see result → view feeding progress and history.

### Partner connection

Open Connect a partner → copy or enter invite code → preview recipient → send request → recipient accepts → both dashboards show their pet and partner.

### Care received

Partner completes a session → user opens or refreshes dashboard → own avatar displays updated care received. Live updates and background notifications are not required.

## 6. Sprint 1 — Focus and care for a pet

### US1 — Account access

As a user, I want to sign up, log in, and log out so that my progress is saved to my account.

Acceptance criteria:

- Users can create an account and log in with valid credentials.
- Invalid submissions display a clear error.
- Logging out returns the user to the login screen.
- Logging back in restores the user’s pet, coins, daily feeding progress, and session state.
- Logging out does not abandon a running trust-based session.

### US2 — Meet my default pet

As a new user, I want to receive a default pet so that I can start focusing immediately.

Acceptance criteria:

- A default pet is created automatically with the account.
- Users can name and rename the pet; a blank name uses a default.
- Naming a pet and connecting a partner are not prerequisites for focusing.

### US3 — Start a focus session

As a user, I want to name my task, choose a duration, and start a timer so that I can commit to focused work.

Acceptance criteria:

- Users can enter a task name; blank names default to “Focus session.”
- Available durations are 15, 25, and 50 minutes.
- Starting displays the task name, countdown, and recorded dependents.
- Only one active session is allowed per user, including across tabs or devices.
- Task name and duration cannot change after starting.
- Refreshing or reopening restores the countdown from the saved end time, or shows completion if the end time passed.
- Switching tabs, minimizing, navigating away, and closing the app do not fail the session.

### US4 — Complete a session and earn rewards

As a user, I want successful sessions to earn food and coins for my dependents so that my effort supports them.

Acceptance criteria:

- A session succeeds at its recorded end time unless abandoned beforehand.
- Each recorded dependent receives one coin per planned minute.
- Each receives feeding-minute credit under the 25-minute apple and two-apple daily rules.
- Partial credit carries between successful sessions within the same feeding day.
- A 15-minute success plus a 10-minute success earns one apple and 25 coins for a dependent starting at zero.
- Refreshes, reopening, retries, or simultaneous requests cannot duplicate rewards.
- The backend rejects attempts to claim completion before the recorded end time.
- Delayed resolution uses the scheduled completion date for daily feeding credit.

### US5 — Give up on a session

As a user, I want to end a session early so that I can stop when I cannot continue.

Acceptance criteria:

- An active session offers Give up and asks for confirmation.
- Confirming before the end abandons the session and shows the dependents’ brief slap animation.
- Abandoned sessions award zero coins, apples, and feeding-minute credit.
- Existing rewards remain unchanged.
- Cancelling confirmation leaves the timer running.
- If the end time has already passed, the session resolves as completed rather than abandoned.

### US6 — View daily feeding progress

As a user, I want to see my pet’s feeding status and coins so that I know how my focus has helped.

Acceptance criteria:

- The dashboard shows the pet’s name, coin balance, today’s apples, and partial progress toward the next apple.
- It displays Hungry, Peckish, or Full according to the feeding rules.
- Feeding is automatic and capped at two apples per day; coins continue increasing after Full.
- Feeding progress resets at midnight in the pet owner’s saved timezone; coins persist.
- Missing days creates no additional penalties.
- Sessions crossing midnight count on their scheduled completion day.

### US7 — Review focus history

As a user, I want to see my past focus sessions so that I can review my activity over time.

Acceptance criteria:

- All completed and abandoned sessions remain accessible, newest first.
- Initially display up to 20 sessions; Load more retrieves the next 20 when available.
- Each entry shows task name, date, planned duration, outcome, dependents, and awarded rewards.
- Abandoned sessions show zero rewards.
- Users can access only their own history.
- An empty history shows “No sessions yet” and a Start focusing action.

Sprint 1 exit: A deployed user can register, focus for a pet, complete or abandon a session, and inspect persistent rewards and history.

## 7. Sprint 2 — Connect and care for a partner

### US8 — Set up my partner-facing profile

As a user, I want a display name and preset avatar so that my partner can recognize and care for me.

Acceptance criteria:

- Users can set a display name and select from a small preset avatar set.
- Defaults are provided.
- Profile changes appear when the partner next opens or refreshes the dashboard.
- The user avatar has feeding progress and coins separate from the pet.

### US9 — Send a partner request

As a user, I want to exchange invite codes so that I can request a connection with someone I know.

Acceptance criteria:

- The connection screen displays the user’s unique code and a Copy button.
- A valid entered code previews the recipient’s display name and avatar.
- Sending requires confirmation.
- Invalid and self codes display errors.
- Only one outgoing pending request is allowed.
- Duplicate pending requests between the same pair, including reverse requests, are prevented.
- Either user already having a partner blocks the request.

### US10 — Manage pending requests

As a user, I want to accept, decline, or cancel partner requests so that I control my connections.

Acceptance criteria:

- Incoming requests list the sender’s name and avatar.
- Recipients accept or decline; senders cancel outgoing pending requests.
- Acceptance creates one mutual connection only if both users are still available.
- Concurrent acceptances cannot give a user multiple partners.
- Other pending requests involving either connected user close upon acceptance.
- Pending requests do not affect focus sessions or rewards.
- Requests are managed in-app; email and push notifications are unnecessary.

### US11 — Focus for my pet and partner

As a connected user, I want sessions to care for my pet and partner so that my focus supports both.

Acceptance criteria:

- New sessions automatically record the pet and connected partner’s avatar as dependents.
- There is no per-session dependent selector.
- Each receives the same coin and feeding-minute credit, subject to its own daily feeding cap.
- Giving up shows the slap animation for both and gives neither new rewards.
- The partner’s pet receives nothing from the user’s session.
- Connecting or disconnecting during a session does not change that session’s recorded dependents.

### US12 — See care given and received

As a user, I want to see whom I care for and what my partner earned for me so that the social impact is clear.

Acceptance criteria:

- You care for shows the user’s pet and connected partner’s avatar with their individual feeding progress and coins.
- Your partner’s care for you shows the user’s own avatar and rewards received.
- Updates appear on opening or refreshing the dashboard.
- Both users see consistent balances for the same recipient avatar.
- Each dependent resets feeding according to its owner’s saved timezone.
- Without a partner, the dashboard shows the pet and Connect a partner.
- Slaps do not remove stored rewards or feeding progress; no delayed animation notification is required for an absent partner.

### US13 — Disconnect from a partner

As a user, I want to disconnect so that I can end the connection and continue independently.

Acceptance criteria:

- Either partner can disconnect after confirmation, without approval from the other.
- The mutual connection ends for both users.
- Pets, existing rewards, and session history remain.
- Future sessions care only for the user’s pet until a new partner is connected.
- Active sessions retain their recorded dependents.
- Both users can connect with someone else afterward.

Sprint 2 exit: Two accounts can connect, complete sessions benefiting both dependents, view care received, and disconnect without losing progress.

## 8. Screens

| Screen | Required content |
| --- | --- |
| Authentication | Signup, login, validation errors |
| Dashboard | Dependents, feeding progress, coins, start action, partner care received |
| Focus | Task input, duration selection, active countdown, dependents, Give up confirmation, result |
| Partner | Own code, code entry, recipient preview, pending requests, connection status, disconnect |
| History | Session entries, empty state, Load more |
| Profile/settings | Display name, preset avatar, pet name, logout |

These may be panels within shared pages; six separate page implementations are not required.

## 9. Technical and quality requirements

Recommended stack, pending team confirmation: Next.js + Tailwind CSS, Next.js backend endpoints, and JavaScript. PostgreSQL or MongoDB remains a team decision. Authentication must meet the assignment’s JWT or OAuth requirement.

- Keep database credentials and reward logic on the server.
- Enforce account ownership and partner visibility on backend endpoints, not only in the interface.
- Save authoritative session start/end times on the backend; do not trust browser-submitted reward amounts.
- Apply session transitions and rewards atomically to avoid partial or duplicate outcomes.
- Provide responsive layouts, labeled inputs, visible focus states, readable contrast, and clear loading/error/empty states.
- A timer does not require a continuously running server countdown; store timestamps and resolve state reliably when queried.
- Treat session lifecycle, rewards, daily caps, and partner requests as explicit state management. Document how these satisfy the assignment’s complex-state-management option; live updates are out of scope.

Assignment engineering work is part of both sprints: shared AGENTS.md; AI-assisted TDD with failing tests committed before implementation; unit, integration, and E2E tests; reviewed branch-per-issue PRs; at least five PR reviews per partner; multi-stage CI with PR tests, security scanning, deploy previews, automated deployment, and environment management.

Each sprint must have a GitHub milestone with at least five issues, joint planning, estimates, at least three standups per person, and a retrospective. Both partners must make meaningful contributions throughout.

## 10. Validation and release criteria

Functional validation must cover:

- Solo success, early abandonment, refresh, reopening after expiry, and duplicate completion requests.
- Partial apple accumulation, daily cap, midnight crossing, and reopening on a later day.
- Invite acceptance, cancellation, decline, competing acceptance attempts, and disconnection during an active session.
- Consistent partner balances and blocked unauthorized access to history or reward changes.
- All-history pagination beyond 20 entries.

Release deliverables: production URL; shared repository; README; documented public API using OpenAPI/Swagger; architecture and database schema diagrams; setup/deployment guide; sprint records; contribution log; ten-minute demo video; and separate 300-word individual reflections.

Product evaluation should observe whether a new user can start without assistance, understands who receives rewards, and returns for additional sessions. These are proposed learning measures, not validated adoption targets. A separate analytics system is not required for the MVP.

## 11. Decisions and assumptions

- Confirmed: default pet for everyone, optional mutual partner, automatic care for all recorded dependents, daily two-apple goal, trust-based timer, and full paginated history.
- Recommended but not yet confirmed: combined Next.js frontend/backend, JavaScript, and browser-derived fixed account timezone.
- Database provider, authentication approach, hosting provider, exact preset artwork, task/name length limits, and developer ownership are implementation decisions to finalize during planning.
- The food example and all calculations use successful planned session minutes; unsuccessful sessions contribute zero minutes.
