# AGENTS.md — OnYou

<!--
  Version 4.
  Shared rules for AI coding agents (Cursor Agent) working in this repository.
  Cursor loads this file automatically from the project root.
  Maintained by both partners: when the agent repeats a mistake, add or sharpen a rule
  in the same PR that fixes it, and record it in the change log (Section 14).
  Product source of truth: PRD Version 2.9.
-->

## 0. How to use this file

<!-- The agent reads this first: it sets priorities when rules seem to conflict. -->

1. Before any task, read the linked GitHub issue and its user story in `OnYou_PRD_v2_9.md`. Use `OnYou_web_mockups.html` for layout, copy, and pet art.
2. Follow, in order of priority: **Domain rules (Section 8) → Security (Section 12) → this file → general best practice.**
3. If the issue, the PRD, and this file disagree, or a requirement is missing, **stop and ask**. Never invent product behavior. A user-facing label and its internal enum token (Section 4) are both required; that pair is not a disagreement.
4. Stay inside the scope of the current issue. Do not refactor or "improve" unrelated code.

Older PRD files (`OnYou_PRD.md`, `OnYou_PRD v2.md`) are historical. Do not implement from them.

## 1. Project context

<!-- What the product is and what it is not, so generated features stay in scope. -->

OnYou is a web app that turns focus time into care for a virtual pet. Every account gets a default pet named Mochi. A user names a task, chooses a 15, 25, or 50-minute session, and keeps **at least one authenticated OnYou tab connected** until the scheduled end. A completed session earns coins and apples for the pet. Giving up, logging out during an Active session, or a gap of 30 seconds or more with no heartbeat, earns nothing and plays a short slap animation on the pet.

A focus session belongs to the **account**, not to a tab. Every logged-in tab shows the same task, countdown, and outcome. Any authenticated tab of the owner may send heartbeats, give up, or request completion.

**Primary users:** students doing self-directed study or work.

**Out of scope — do not build, stub, or scaffold:** partner connections, invite codes, avatars, display names, notifications (email or push), spending coins, shops, food inventory, pause/resume, custom durations, social login, timezone editing, history search or filters, native mobile apps, AI features, WebSockets. Password-reset email is the only email the app sends.

**Obsolete — do not implement:** the PRD v2.0 starting-tab **sessionStorage completion-token** model (`onyou.sessionToken`, `X-Session-Token`, hashed focus-session tokens, `SessionElsewhereNotice`, “only the starting tab can complete”). Presence is approximated with heartbeats, not tab tokens.

## 2. Tech stack and versions

<!-- Pin to package.json. Update this table in any PR that upgrades a dependency. -->
<!-- PRD v2.9 leaves specific libraries to the technical specification; this table is that specification. Do not add libraries not listed here. -->

| Area | Technology | Version | Notes |
| --- | --- | --- | --- |
| Language | TypeScript | 5.x | `strict: true` |
| Runtime | Node.js | 22 LTS | Route Handlers run on Node, never Edge |
| Framework | Next.js (App Router) | 16.x | Server Components by default |
| UI | React | 19.x | Function components and hooks only |
| Styling | Tailwind CSS | 4.x | Design tokens in Section 7.2 |
| Database | PostgreSQL (Neon) | 16 | Branch per preview deployment |
| ORM | Prisma | 6.x | Migrations committed with each PR |
| Auth | `jose` (JWT), `bcrypt` | latest stable | JWT in HttpOnly cookie |
| Validation | Zod | 3.x | Shared by client and server |
| Email | Resend | latest stable | Password reset only |
| Unit/integration tests | Vitest + `@vitest/coverage-v8` | 3.x | |
| Component tests | React Testing Library | latest stable | |
| E2E tests | Playwright | 1.x | |
| API docs | OpenAPI 3.1 + Swagger UI | — | `docs/openapi.yaml` |
| Lint/format | ESLint, Prettier | latest stable | |
| CI/CD | GitHub Actions | — | Lint, typecheck, tests, CodeQL, `npm audit` |
| Hosting | Vercel | — | Preview per PR, production from `main` |

No WebSocket library. Heartbeats use ordinary authenticated HTTP requests.

### Commands

```bash
npm run dev               # local dev server
npm run build             # production build
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run format            # Prettier (write)
npm run test              # Vitest unit + component tests
npm run test:integration  # Vitest integration tests against TEST_DATABASE_URL
npm run test:coverage     # Vitest with coverage report
npm run test:e2e          # Playwright
npx prisma migrate dev    # create and apply a migration locally
```

Before reporting a task as done, run `lint`, `typecheck`, and the relevant test commands, and state the results.

## 3. Architecture overview

<!-- Where code goes and how layers depend on each other. -->

```
src/
  app/                       # routes: pages, layouts, loading.tsx, error.tsx
    (auth)/login/            # public pages
    (auth)/signup/
    (auth)/forgot-password/
    (auth)/reset-password/
    (app)/dashboard/         # authenticated pages (Home)
    (app)/focus/
    (app)/history/
    (app)/settings/
    api/                     # Route Handlers (HTTP layer only)
  components/                # React components (see Section 7.3)
    ui/                      # generic primitives: Button, Input, Modal, Spinner
  hooks/                     # client hooks: useActiveSession, useCountdown, useHeartbeat
  lib/
    domain/                  # PURE business logic, no I/O, no Prisma, no Date.now()
    server/                  # services that use Prisma, auth, email
    validation/              # Zod schemas shared by forms and Route Handlers
    api/                     # typed fetch helpers used by the client
prisma/
  schema.prisma
  migrations/
tests/
  unit/                      # mirrors src/lib/domain
  integration/               # Route Handler + real database tests
  factories/                 # test data builders
e2e/                         # Playwright specs
docs/
  openapi.yaml
  diagrams/
```

Product references at the repository root: `OnYou_PRD_v2_9.md`, `OnYou_web_mockups.html`. Keep previous PRD versions; do not delete them.

`useHeartbeat` is a client hook over `fetch` to `POST /api/sessions/{id}/heartbeat`. It is not a new library or realtime subsystem.

### Layering (dependencies point downward only)

```
app/ pages and components  →  lib/api (client fetch)  →  app/api Route Handlers
app/api Route Handlers     →  lib/validation + lib/server services
lib/server services        →  lib/domain + Prisma
lib/domain                 →  nothing (pure TypeScript)
```

### Key patterns

- **Thin Route Handlers.** A handler parses input with Zod, authenticates, calls one service function, and maps the result to JSON. No business rules in handlers.
- **Pure domain logic.** Reward, feeding, presence, and session-state rules live in `src/lib/domain/` as pure functions. They take the current time as a parameter (`now: Date`) and never read the clock, the database, or the environment.
- **Services own transactions.** Any operation that changes session state and rewards together runs in one `prisma.$transaction`. Run one shared resolution routine before every session operation (PRD v2.9 §10).
- **Single Prisma client** exported from `src/lib/server/db.ts`.
- **Server Components by default.** Add `'use client'` only for components that need state, effects, or browser APIs (timer, forms, modals, heartbeats).
- **Typed results, not thrown strings.** Services return typed results or throw an `AppError` with a code from Section 9; handlers convert it to the standard error shape.

## 4. Naming conventions

<!-- Consistent names across both partners and the agent. -->

| Item | Convention | Example |
| --- | --- | --- |
| React components | `PascalCase.tsx`, named export | `FocusTimer.tsx` → `export function FocusTimer` |
| Hooks | `useCamelCase.ts` | `useCountdown.ts`, `useHeartbeat.ts` |
| Domain and service modules | `camelCase.ts`, noun-based | `rewards.ts`, `sessionService.ts`, `presence.ts` |
| Functions | `camelCase`, verb-first | `calculateRewards`, `startSession`, `renewHeartbeat` |
| Booleans | `is`/`has`/`can` prefix | `isFull`, `hasActiveSession` |
| Constants | `UPPER_SNAKE_CASE` | `APPLE_MINUTES = 25`, `HEARTBEAT_INTERVAL_MS = 10000`, `PRESENCE_GRACE_SECONDS = 30` |
| Types and interfaces | `PascalCase`, no `I` prefix | `RewardResult`, `FeedingState`, `PresenceDeadline` |
| Zod schemas | `camelCase` + `Schema` | `startSessionSchema` |
| Prisma models | singular `PascalCase` | `User`, `Pet`, `FocusSession`, `DailyFeeding` |
| Prisma fields | `camelCase` | `endTime`, `lastHeartbeatAt` |
| Enums | `PascalCase` name, `UPPER_CASE` values in code, Prisma, and JSON | `SessionStatus.ACTIVE` |
| User-facing labels | PRD and `OnYou_web_mockups.html` copy, exactly | State label `Starving`; history badge `Completed` |
| API routes | plural nouns, kebab-case | `/api/sessions/{id}/complete`, `/api/sessions/{id}/heartbeat` |
| Env variables | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |
| Unit/integration tests | `<module>.test.ts` | `rewards.test.ts` |
| E2E specs | `<flow>.spec.ts` | `focus-session.spec.ts` |

Internal tokens and visible labels name the same state. Do not rename a token to the display word, and do not render the token as copy. Business meaning stays on the token.

| Internal value | Meaning (unchanged) | User-facing label |
| --- | --- | --- |
| `FeedingState.STARVING` | 0 apples | Starving |
| `FeedingState.HUNGRY` | 1 apple | Hungry |
| `FeedingState.FULL` | 2 apples | Full |
| `SessionStatus.ACTIVE` | in progress, account-owned | Active |
| `SessionStatus.COMPLETED` | final; rewards only when the presence rule is met | Completed |
| `SessionStatus.ABANDONED` | final; zero coins, apples, and feeding minutes | Abandoned |

Sentences and `alt` text follow the mockup, including “Mochi is hungry”. The state-label element is the title-case word, not `HUNGRY`.

## 5. Coding standards

<!-- How code should look. Lint and typecheck enforce most of these. -->

- TypeScript `strict`. No `any`, no `@ts-ignore`; use `unknown` and narrow.
- Exported functions declare parameter and return types.
- Derive types from Zod schemas with `z.infer` rather than duplicating them.
- Named exports everywhere except Next.js files that require default exports (`page.tsx`, `layout.tsx`).
- Keep functions under ~40 lines and components under ~150 lines; extract when larger.
- No magic numbers: use named constants (`APPLE_MINUTES`, `MAX_APPLES_PER_DAY`, `DURATIONS = [15, 25, 50]`, `HEARTBEAT_INTERVAL_MS`, `PRESENCE_GRACE_SECONDS`).
- Early returns over nested conditionals.
- Comments explain *why*, not *what*. Reference the user story for non-obvious rules: `// US6: credit counts on the scheduled end date`.
- Do not silence an unused parameter with a no-op (`void now`, an empty assignment, or a dummy read). If the signature requires a parameter this function does not read, keep the parameter and comment why it is there. Example: `now` stays on a reward function so callers pass the clock, while the feeding day is the session `endTime` (US6). Do not branch on that parameter only to make it look used.
- Store all timestamps in UTC; convert to the user's timezone only in domain functions that need a feeding day, and in display.

## 6. Testing strategy

<!-- TDD is required and graded: a failing run, then a passing run, then a recorded refactor pass. Commits stay test → feat → refactor. -->

### TDD workflow (red → green → refactor)

Run each step and keep the command output. Writing the tests and the implementation in one edit, before any test run, does not count as red.

1. **Red.** Turn each acceptance criterion of the issue into one or more tests. Run those tests and confirm they fail because the behavior is not implemented yet. Commit the tests alone: `test: <behavior> (#<issue>)`.
2. **Green.** Write the minimum code that makes those tests pass. Run the same tests and confirm they pass. Commit: `feat: <description> (#<issue>)`.
3. **Refactor.** With those tests still the specification, improve structure only. Record what changed. If this pass edits code, commit: `refactor: <description> (#<issue>)`. If nothing should change, record that and re-run the tests. Do not add an unrelated edit so that a refactor commit exists.

Commit types stay the team workflow in Section 10: `test`, then `feat`, then `refactor` when the refactor pass changes code. Squash-merge is still not used, so those commits stay visible.

The PR body records evidence for all three steps: the command (`npm test`, or the narrower script that runs these tests), the result (failed or passed, with counts), and the refactor note.

Rules for the agent:

- When asked to implement a feature, **propose the tests first** and wait for approval before writing implementation code. After approval, the red run still happens before any implementation.
- A suite that passes on the first run, with no earlier failing run of those tests, has not completed red.
- Never delete, skip (`.skip`, `.only`, `.todo`), or loosen an assertion to make a test pass. If a test looks wrong, stop and explain why.
- Never mock the module under test.

### Test levels

| Level | Tool | Location | What it covers |
| --- | --- | --- | --- |
| Unit | Vitest | `tests/unit/` | Every function in `lib/domain/`: rewards, feeding states, daily cap, feeding day, presence deadline, session transitions |
| Component | Vitest + React Testing Library | next to component or `tests/unit/components/` | Timer display, form validation messages, Give up confirmation |
| Integration | Vitest + real PostgreSQL | `tests/integration/` | Route Handlers end to end: auth, ownership, status codes, error shape, transactions, duplicate requests, concurrent heartbeats |
| E2E | Playwright | `e2e/` | User flows in Section 7.4, including refresh, a second tab, and reconnect |

### Patterns

- Arrange–Act–Assert structure; one behavior per test.
- Test names describe behavior: `it('caps feeding credit at two apples per day')`.
- Use builders in `tests/factories/` (`buildUser`, `buildSession`) instead of hand-written fixtures.
- Control time by passing `now` to domain functions; in integration and component tests use Vitest fake timers. Never `sleep` in tests.
- Integration tests use a dedicated test database and reset it between test files. Do not mock Prisma in integration tests.
- Cover the edge cases in PRD v2.9 §11: multiple tabs, presence boundaries, sleep, network loss, concurrent heartbeat/complete/give-up, duplicate completion, stale Active session before a new start, midnight crossing, delayed resolution, pagination past 20, input limits. Do **not** write tests that require a focus-session token in `sessionStorage`.

### Coverage goals

- `src/lib/domain/`: **≥ 95%** lines and branches.
- Overall: **≥ 80%** lines.
- Every acceptance criterion maps to at least one test; list the mapping in the PR description.
- CI fails if coverage drops below these thresholds.

## 7. PRD and design references

<!-- Bridges the PRD and mockups to implementation. -->

### 7.1 Sources of truth

- **PRD:** `OnYou_PRD_v2_9.md` — product rules, user stories US1–US8, session/presence/reward rules, input limits, validation cases.
- **Mockups:** `OnYou_web_mockups.html` — layout, copy, and original pet art (desktop 1040px and phone 390px). The mockup decides layout and visual style; the PRD decides behavior. If they conflict, follow the PRD and flag it.
- **API contract:** `docs/openapi.yaml`.

| Story | Title | Area |
| --- | --- | --- |
| US1 | Account access | Accounts |
| US2 | Reset password | Accounts |
| US3 | Meet my default pet | Pet |
| US4 | View daily feeding progress | Pet |
| US5 | Start a focus session | Focus sessions |
| US6 | Complete a session and earn rewards | Focus sessions |
| US7 | Give up on a session | Focus sessions |
| US8 | Review focus history | History |

### 7.2 Mockup description and visual style

<!-- Keep in sync with OnYou_web_mockups.html. -->

- **Feel:** calm, friendly, low-distraction. The pet is the emotional center of every authenticated screen.
- **Layout:** one responsive web app. Desktop browser 1040px; phone 390px; layout adapts below 600px. On phones, dialogs are bottom sheets, buttons span the screen, the duration-picker pet preview is hidden, and inputs use 16px text.
- **Navigation:** top bar with **Home**, History, Settings. It stays visible during an Active session. Every screen other than the timer also shows an **active session bar** (task, time left, end time, Return to session). Start focusing is disabled with “One session at a time”.
- **Colors:** use Tailwind theme tokens, not raw hex: `primary` / pine (actions), `surface` (cards), `danger` / plum (Give up, errors), apple red (food), `success` (completed). Support light and dark mode.
- **Typography:** one sans-serif family; large countdown digits (tabular numerals) on the focus screen.
- **Pet art:** reuse the mockup’s original in-code SVG for Starving, Hungry, Full, waiting, and slapped. Do not generate or substitute artwork. Slap animation lasts under one second and respects `prefers-reduced-motion`.
- **Visible labels:** the on-screen state words are Starving, Hungry, and Full, copied from the PRD and the mockup. Domain values stay `STARVING`, `HUNGRY`, and `FULL` (Section 4). History outcome badges stay Completed and Abandoned.

### 7.3 Key UI components

| Component | Location | Expected behavior |
| --- | --- | --- |
| `AuthForm` | `components/AuthForm.tsx` | Email and password fields with inline Zod errors; submit disabled while pending; shows server error message. Login uses one error that does not reveal which field was wrong. |
| `PetCard` | `components/PetCard.tsx` | Mockup SVG for current state, name, state label (Starving/Hungry/Full), coin balance, apples today (0–2). |
| `FeedingProgress` | `components/FeedingProgress.tsx` | Minutes toward the next apple (0–25); shows "Full for today" at two apples. |
| `DurationPicker` | `components/DurationPicker.tsx` | Three options only (15, 25, 50) as a radio group; keyboard selectable. |
| `ActiveSessionBar` | `components/ActiveSessionBar.tsx` | On every logged-in screen other than the timer while a session is Active: task, time left, end time, Return to session. |
| `FocusTimer` | `components/FocusTimer.tsx` | Task name, countdown computed from server `endTime` (never a local counter alone), pet, Give up. Shown in every logged-in tab. Restores on refresh. Sends heartbeats. |
| `ConnectionWarning` | `components/ConnectionWarning.tsx` | Shown whenever session requests fail; copy warns that ~30 seconds disconnected ends the session without rewards. |
| `GiveUpDialog` | `components/GiveUpDialog.tsx` | Confirmation; Keep focusing leaves the timer running; Give up abandons on every tab. Focus trapped while open. Bottom sheet on phones. |
| `SessionResult` | `components/SessionResult.tsx` | Completed: coins, feeding minutes, and apples earned (including 0 and cap-discard copy). Abandoned: zeros and slap animation. |
| `HistoryList` | `components/HistoryList.tsx` | Newest first, 20 per page, Load more; desktop table / phone cards; “No rewards” when Abandoned; end-of-list note; empty state with Start focusing. |
| `ui/*` | `components/ui/` | `Button`, `Input`, `Modal`, `Spinner`, `ErrorMessage`; build screens from these, not one-off styles. |

Do **not** add `SessionElsewhereNotice` or any UI that treats a tab without a sessionStorage token as unable to complete the session.

### 7.4 User flows the agent must follow

1. **Sign up (US1, US3):** Signup form → account and default pet (Mochi) created in one transaction → redirect to Home showing the pet as Starving with 0 coins; optional “Name your pet”.
2. **Log in / out (US1):** Login → Home. Logout with an Active session → confirm dialog → session abandoned on every device → Login screen.
3. **Start a session (US5):** Home → Start focusing → task name (optional) → pick duration → Start → server records `startTime`, `endTime`, and the first heartbeat → every open tab shows the countdown from `endTime` and sends heartbeats every 10 seconds.
4. **Refresh or another tab (US5):** page loads → `GET /api/sessions/active` → if Active, this tab **joins** (same countdown, heartbeat, Give up, complete). No sessionStorage token.
5. **Presence loss (US5):** if no heartbeat from any tab renews the presence deadline at or before the scheduled end, the next request resolves the session as Abandoned and shows the slap result. Show a connection warning when requests fail.
6. **Complete (US6):** after scheduled end, any owning tab may request completion. Server completes only if the presence deadline is **strictly later** than the scheduled end. Rewards apply once → `SessionResult` → Home reflects new state.
7. **Give up (US7):** Give up on any tab → `GiveUpDialog` → confirm → abandoned on all tabs, zero rewards, slap → `SessionResult`. If the scheduled end already passed **and** the presence rule was met, the server completes instead.
8. **History (US8):** History → first 20 sessions → Load more until the end-of-list note → empty state if none.
9. **Password reset (US2):** Forgot password → email → same confirmation for any email → link → new password → all JWTs signed out → Login with “Password updated”. Reset does not abandon an Active session in the reset handler; signing out stops heartbeats (PRD v2.9 US2).

Every screen handles **loading, error, and empty** states.

## 8. Domain rules (invariants)

<!-- Highest priority. Encode these in lib/domain and test each one. -->

### Sessions (PRD v2.9 §5)

- Durations are exactly `15`, `25`, or `50` minutes.
- A session belongs to the account. An account has at most one `ACTIVE` session across all tabs and devices, enforced by a partial unique index in PostgreSQL (raw SQL migration if Prisma cannot express it).
- Status values: `ACTIVE`, `COMPLETED`, `ABANDONED`. `COMPLETED` and `ABANDONED` are final.
- `endTime = startTime + duration`, both set by the server. Also store `lastHeartbeatAt`.
- Starting a session records the first heartbeat. Each tab sends a heartbeat when it joins and every `HEARTBEAT_INTERVAL_MS` (10 seconds) while the session is Active.
- Presence deadline = latest **accepted** heartbeat plus `PRESENCE_GRACE_SECONDS` (30 seconds). A heartbeat received **before** the deadline renews it. If the deadline passes at or before the scheduled end, the session is Abandoned; later heartbeats cannot revive it.
- **Completed** if the session was not abandoned and its presence deadline is **strictly later** than the scheduled end. Otherwise **Abandoned**.
- Give up before the scheduled end abandons. Give up after the scheduled end, on a session that met the presence rule, completes it.
- Completion requests before the scheduled end are rejected.
- Logout during an Active session asks for confirmation, then abandons on all tabs and devices.
- The server has no running timer. It resolves outcome on the next request of any kind, judging stored timestamps against the scheduled end, not the time of the request. Run the shared resolution routine before every session operation: check the scheduled end before applying a later expiry, and resolve expiry before renewing a heartbeat.
- All tabs have equal authority: any authenticated owning tab may heartbeat, give up, or request completion.
- **Never** implement focus-session tokens, `sessionStorage` keys for completion, or `X-Session-Token`. Never use `beforeunload`, `pagehide`, `localStorage`, or cookies to decide session outcomes. Do not use WebSockets.

### Rewards and feeding (PRD v2.9 §6)

- Coins: `durationMinutes` coins per completed session; abandoned sessions earn zero coins, apples, and feeding minutes.
- Feeding minutes: each completed session adds its duration, capped at 50 per feeding day. Minutes beyond the cap are discarded.
- Apples: one per 25 feeding minutes; at most 2 per feeding day. Leftover minutes carry within the same feeding day.
- Coins keep accruing after the pet is Full. Coins never reset.
- Feeding state, internal tokens: `0 → STARVING`, `1 → HUNGRY`, `2 → FULL`. Screens show Starving, Hungry, and Full (Section 4). Zero, one, and two apples still mean those three states.
- Feeding day = the session's `endTime` converted to the user's saved IANA timezone, even if resolved later. Late resolution must never credit the current day.
- Daily reset clears apples and feeding minutes; coins never reset. Missed days have no penalty.
- Rewards apply **exactly once**: the status change and reward update happen in one transaction with a conditional update (`WHERE status = 'ACTIVE'`), so retries and concurrent requests cannot double-award.
- The server computes all rewards. Never accept reward values from the client.

Reference example (must be a unit test; PRD v2.9 §6): starting from zero on one feeding day, complete 15 min → 15 coins, 15 feeding minutes, 0 apples, Starving; complete 15 min → 30 coins, 30 feeding minutes (5 toward next apple), 1 apple, Hungry; give up a 25-min session → unchanged totals; complete 25 min → 55 coins, 50 feeding minutes (5 discarded by cap), 2 apples, Full. Assert internal tokens as `STARVING`, `HUNGRY`, and `FULL`. Assert rendered copy as Starving, Hungry, and Full.

### Input limits (shared Zod schemas in `lib/validation/`)

| Field | Rule |
| --- | --- |
| Email | Required, valid format, unique case-insensitive, max 254 characters |
| Password | 8–15 characters |
| Task name | Trimmed, max 80; blank becomes `"Focus session"` |
| Pet name | Trimmed, max 30; blank uses the default name, **Mochi** |

Reject over-limit input with a clear message; never truncate silently.

## 9. API conventions

<!-- Keeps endpoints predictable and documented. -->

- JSON in and out; `camelCase` keys; ISO 8601 UTC timestamps.
- Success: return the resource directly (`200`, or `201` on create).
- Error shape: `{ "error": { "code": "SESSION_NOT_FOUND", "message": "Human-readable message" } }`.
- Status codes: `400` validation, `401` not logged in, `403` not the owner, `404` not found, `409` conflict (active session exists, already resolved), `429` rate limited.
- Every handler checks that the authenticated user owns the resource.
- Pagination: `?cursor=<id>&limit=20`, response `{ items, nextCursor }`.
- Every PR that adds or changes an endpoint updates `docs/openapi.yaml` in the same PR.

Planned endpoints:

| Method | Path | Story |
| --- | --- | --- |
| POST | `/api/auth/signup` | US1 |
| POST | `/api/auth/login` | US1 |
| POST | `/api/auth/logout` | US1 |
| POST | `/api/auth/password-reset/request` | US2 |
| POST | `/api/auth/password-reset/confirm` | US2 |
| GET | `/api/pet` | US3, US4 |
| PATCH | `/api/pet` | US3 |
| POST | `/api/sessions` | US5 |
| GET | `/api/sessions/active` | US5 |
| POST | `/api/sessions/{id}/heartbeat` | US5 |
| POST | `/api/sessions/{id}/complete` | US6 |
| POST | `/api/sessions/{id}/abandon` | US7 |
| GET | `/api/sessions` | US8 |

Do not document or implement `X-Session-Token` on these endpoints.

## 10. Scrum and workflow

<!-- How work flows from GitHub Issues to merged code. -->

### Board, labels, milestones

- Project board columns: **Backlog → Sprint Todo → In Progress → In Review → Done**. Move the issue when work starts, when the PR opens, and when it merges.
- Labels: `feature`, `bug`, `chore`, `docs`, `test`, plus `priority:high`, `priority:medium`, `priority:low`.
- Milestones: `Sprint 1`, `Sprint 2`. Every issue has a milestone, labels, an estimate, and an acceptance-criteria checklist.

### Branch naming

`<type>/<issue-number>-<short-kebab-description>`

- Types: `feature`, `fix`, `chore`, `docs`, `test`.
- Examples: `feature/12-start-session-api`, `fix/31-double-reward`, `chore/2-ci-pipeline`.
- One branch per issue. Branch from the latest `main`.

### Commit messages (Conventional Commits)

`<type>(<optional scope>): <imperative summary> (#<issue>)`

- Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`.
- Examples: `test(rewards): cap feeding credit at two apples (#11)`, `feat(sessions): record first heartbeat on start (#12)`.
- Summary under 72 characters, imperative mood, no trailing period.

### Pull requests

- Title: same format as a commit message.
- Body must include: `Closes #<issue>`, summary, acceptance-criteria-to-test mapping, screenshots for UI changes, and an **AI usage** note (what the agent generated, what was changed by hand).
- Requirements before merge: CI green (lint, typecheck, tests, coverage, CodeQL, `npm audit`), Vercel preview working, **approval from the other partner**.
- Squash-merge is not used, so TDD commits (`test:` before `feat:`) stay visible in history.
- Never push directly to `main`.

### Referencing issues in code

- Follow-up work: `// TODO(#<issue>): <what remains>`. Never leave a TODO without an issue number.
- Non-obvious rules: `// US6: <rule>` pointing to the user story.

### Definition of done

All acceptance criteria checked, red–green–refactor evidence recorded (Section 6), tests passing, coverage thresholds met, OpenAPI updated if the API changed, loading/error/empty states handled, PR approved and merged, issue moved to Done.

## 11. Do's and don'ts

<!-- Quick reference. -->

| Do | Don't |
| --- | --- |
| Put business rules in `lib/domain/` as pure functions | Put reward, feeding, or presence math in Route Handlers or components |
| Pass `now` into domain functions | Call `Date.now()` or `new Date()` inside `lib/domain/` |
| Comment why a required parameter is unused | Silence it with `void param` or another no-op |
| Compute the countdown from the server's `endTime` | Trust a client-side counter to decide success |
| Send heartbeats every 10 seconds from every open authenticated tab | Implement `sessionStorage` completion tokens, `X-Session-Token`, or `SessionElsewhereNotice` |
| Keep heartbeats running across OnYou screen navigation | Use `localStorage`, cookies, `beforeunload`, or WebSockets for session presence |
| Validate every input with shared Zod schemas | Validate only in the browser |
| Wrap state change + rewards in one transaction | Update session status and rewards in separate calls |
| Prevent overlapping requests in a tab; ignore stale responses | Invent extra realtime infrastructure |
| Use named constants (`APPLE_MINUTES`, `HEARTBEAT_INTERVAL_MS`) | Hardcode `25`, `50`, `2`, `10`, or `30` in logic |
| Build screens from `components/ui/` primitives | Write one-off inline styles or new CSS files |
| Reuse mockup pet SVG art | Generate or substitute pet artwork |
| Ask when requirements are unclear | Invent behavior or build out-of-scope features |
| Keep changes scoped to the issue | Refactor unrelated files |

### Preferred dependencies

| Need | Use | Avoid |
| --- | --- | --- |
| Styling | Tailwind CSS | CSS-in-JS, Bootstrap, component kits |
| Validation | Zod | Yup, hand-written validators |
| Database | Prisma | Raw `pg` queries (except migrations needing raw SQL) |
| JWT | `jose` | `jsonwebtoken` |
| Password hashing | `bcrypt` | Custom hashing, MD5/SHA for passwords |
| HTTP client | native `fetch` | Axios |
| Dates and timezones | `Intl` APIs | Moment.js |
| State | React state and hooks | Redux or global state libraries |
| Presence | HTTP heartbeat (`fetch`) | WebSockets, `sessionStorage` tokens, unload events |

Ask before adding any dependency not listed in Section 2.

## 12. Security requirements

<!-- Non-negotiable. -->

- Secrets only in environment variables; keep `.env.example` with names only. Never log or commit secrets.
- Hash passwords with `bcrypt` (cost ≥ 10).
- JWT in an HttpOnly, Secure, SameSite=Lax cookie; never readable by client JavaScript. Include a per-user `tokenVersion`; a password reset increments it to sign out all sessions.
- Password-reset tokens are random (`crypto.randomBytes`), stored hashed, and compared in constant time. Do **not** create hashed tokens for focus-session completion.
- Reset tokens are single-use and expire after 30 minutes; a new request invalidates older tokens.
- Password-reset requests return the same response for unknown emails and are rate-limited per email and per IP, with counters in PostgreSQL.
- Every endpoint authenticates and checks ownership on the server. Heartbeat, complete, and abandon require the authenticated owner; they do not use a tab-scoped session token.
- Never return password hashes, reset-token hashes, or internal errors to the client.
- Do not log passwords, reset tokens, or full JWTs.

## 13. Accessibility requirements

<!-- Target WCAG 2.2 AA. -->

- Semantic HTML: `button` for actions, `a` for navigation, one `h1` per page, landmarks (`header`, `main`, `nav`).
- Every input has a visible `label`; errors are linked with `aria-describedby` and announced with `aria-live="polite"`.
- All interactions work by keyboard with visible focus rings; modals trap focus and close with Escape. On phones, confirmation dialogs open as bottom sheets.
- Text contrast at least 4.5:1; never use color alone to show pet state (always include the text label).
- The countdown exposes remaining time to screen readers without announcing every second (announce at start, each minute, and completion).
- Respect `prefers-reduced-motion` for the slap and pet animations.
- Pet images have descriptive `alt` text, such as "Mochi is hungry".

## 14. Maintaining this file

<!-- Evidence of iteration: every change is logged. -->

- Both partners edit this file. Add a rule in the PR where the need appeared, and keep rules short and testable.
- Remove rules that no longer apply rather than leaving contradictions.
- `HW3_AGENTS_BASELINE.md` is the frozen HW3 experiment copy of this file after the PRD v2.9 sync. Do not edit that snapshot. Later refinements belong in this live `AGENTS.md` and must be based on experimental observations.

### Change log

| Date | Version | Partner | Change |
| --- | --- | --- | --- |
| 2026-10-27 | 1 | A | Initial draft: stack, structure, conventions, workflow, basic do's and don'ts |
| 2026-10-28 | 2 | A, B | Added domain invariants, layering and `now` injection, strict TDD steps, coverage goals, detailed mockup and component behavior, user flows, API conventions and endpoint list, security and accessibility specifics, priority order |
| 2026-10-27 | 3 | B | Synced to PRD v2.9: account-owned sessions, heartbeat presence, HTML mockups, Mochi default name; prohibited obsolete sessionStorage completion tokens |
| 2026-10-27 | 4 | B | After the Issue #11 before/after run: split internal enum tokens from PRD/mockup labels; require a failing run, a passing run, and a recorded refactor pass while keeping `test` / `feat` / `refactor` commits; forbid no-op unused-parameter silencing |
