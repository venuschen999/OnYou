# AGENTS.md — OnYou

<!--
  Version 2.
  Shared rules for AI coding agents (Cursor Agent) working in this repository.
  Cursor loads this file automatically from the project root.
  Maintained by both partners: when the agent repeats a mistake, add or sharpen a rule
  in the same PR that fixes it, and record it in the change log (Section 14).
-->

## 0. How to use this file

<!-- The agent reads this first: it sets priorities when rules seem to conflict. -->

1. Before any task, read the linked GitHub issue and its user story in `docs/PRD.md`.
2. Follow, in order of priority: **Domain rules (Section 8) → Security (Section 12) → this file → general best practice.**
3. If the issue, the PRD, and this file disagree, or a requirement is missing, **stop and ask**. Never invent product behavior.
4. Stay inside the scope of the current issue. Do not refactor or "improve" unrelated code.

## 1. Project context

<!-- What the product is and what it is not, so generated features stay in scope. -->

OnYou is a web app that turns focus time into care for a virtual pet. A user names a task, chooses a 15, 25, or 50-minute session, and keeps the starting tab open until the timer ends. A completed session earns coins and apples for the pet. Giving up, or closing the tab, earns nothing and plays a short slap animation on the pet.

**Primary users:** students doing self-directed study or work.

**Out of scope — do not build, stub, or scaffold:** partner connections, invite codes, avatars, display names, notifications (email or push), spending coins, shops, food inventory, pause/resume, custom durations, social login, timezone editing, history search or filters, native mobile apps, AI features. Password-reset email is the only email the app sends.

## 2. Tech stack and versions

<!-- Pin to package.json. Update this table in any PR that upgrades a dependency. -->

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
    (app)/dashboard/         # authenticated pages
    (app)/focus/
    (app)/history/
    (app)/settings/
    api/                     # Route Handlers (HTTP layer only)
  components/                # React components (see Section 7.3)
    ui/                      # generic primitives: Button, Input, Modal, Spinner
  hooks/                     # client hooks: useActiveSession, useCountdown
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
  PRD.md
  openapi.yaml
  mockups/
  diagrams/
```

### Layering (dependencies point downward only)

```
app/ pages and components  →  lib/api (client fetch)  →  app/api Route Handlers
app/api Route Handlers     →  lib/validation + lib/server services
lib/server services        →  lib/domain + Prisma
lib/domain                 →  nothing (pure TypeScript)
```

### Key patterns

- **Thin Route Handlers.** A handler parses input with Zod, authenticates, calls one service function, and maps the result to JSON. No business rules in handlers.
- **Pure domain logic.** Reward, feeding, and session-state rules live in `src/lib/domain/` as pure functions. They take the current time as a parameter (`now: Date`) and never read the clock, the database, or the environment.
- **Services own transactions.** Any operation that changes session state and rewards together runs in one `prisma.$transaction`.
- **Single Prisma client** exported from `src/lib/server/db.ts`.
- **Server Components by default.** Add `'use client'` only for components that need state, effects, or browser APIs (timer, forms, modals).
- **Typed results, not thrown strings.** Services return typed results or throw an `AppError` with a code from Section 9; handlers convert it to the standard error shape.

## 4. Naming conventions

<!-- Consistent names across both partners and the agent. -->

| Item | Convention | Example |
| --- | --- | --- |
| React components | `PascalCase.tsx`, named export | `FocusTimer.tsx` → `export function FocusTimer` |
| Hooks | `useCamelCase.ts` | `useCountdown.ts` |
| Domain and service modules | `camelCase.ts`, noun-based | `rewards.ts`, `sessionService.ts` |
| Functions | `camelCase`, verb-first | `calculateRewards`, `startSession` |
| Booleans | `is`/`has`/`can` prefix | `isFull`, `hasActiveSession` |
| Constants | `UPPER_SNAKE_CASE` | `APPLE_MINUTES = 25` |
| Types and interfaces | `PascalCase`, no `I` prefix | `RewardResult`, `FeedingState` |
| Zod schemas | `camelCase` + `Schema` | `startSessionSchema` |
| Prisma models | singular `PascalCase` | `User`, `Pet`, `FocusSession`, `DailyFeeding` |
| Prisma fields | `camelCase` | `endTime`, `tokenHash` |
| Enums | `PascalCase` name, `UPPER_CASE` values | `SessionStatus.ACTIVE` |
| API routes | plural nouns, kebab-case | `/api/sessions/{id}/complete` |
| Env variables | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |
| Unit/integration tests | `<module>.test.ts` | `rewards.test.ts` |
| E2E specs | `<flow>.spec.ts` | `focus-session.spec.ts` |

## 5. Coding standards

<!-- How code should look. Lint and typecheck enforce most of these. -->

- TypeScript `strict`. No `any`, no `@ts-ignore`; use `unknown` and narrow.
- Exported functions declare parameter and return types.
- Derive types from Zod schemas with `z.infer` rather than duplicating them.
- Named exports everywhere except Next.js files that require default exports (`page.tsx`, `layout.tsx`).
- Keep functions under ~40 lines and components under ~150 lines; extract when larger.
- No magic numbers: use named constants (`APPLE_MINUTES`, `MAX_APPLES_PER_DAY`, `DURATIONS = [15, 25, 50]`).
- Early returns over nested conditionals.
- Comments explain *why*, not *what*. Reference the user story for non-obvious rules: `// US6: credit counts on the scheduled end date`.
- Store all timestamps in UTC; convert to the user's timezone only in domain functions that need a feeding day, and in display.

## 6. Testing strategy

<!-- TDD is required and graded: failing tests must be committed before implementation. -->

### TDD workflow (red → green → refactor)

1. **Red.** Turn each acceptance criterion of the issue into one or more failing tests. Commit the tests alone: `test: <behavior> (#<issue>)`.
2. **Green.** Write the minimum code to pass. Commit: `feat: <description> (#<issue>)`.
3. **Refactor.** Improve the code with tests green. Commit: `refactor: <description> (#<issue>)`.

Rules for the agent:

- When asked to implement a feature, **propose the tests first** and wait for approval before writing implementation code.
- Never delete, skip (`.skip`, `.only`, `.todo`), or loosen an assertion to make a test pass. If a test looks wrong, stop and explain why.
- Never mock the module under test.

### Test levels

| Level | Tool | Location | What it covers |
| --- | --- | --- | --- |
| Unit | Vitest | `tests/unit/` | Every function in `lib/domain/`: rewards, feeding states, daily cap, feeding day, session transitions |
| Component | Vitest + React Testing Library | next to component or `tests/unit/components/` | Timer display, form validation messages, Give up confirmation |
| Integration | Vitest + real PostgreSQL | `tests/integration/` | Route Handlers end to end: auth, ownership, status codes, error shape, transactions, duplicate requests |
| E2E | Playwright | `e2e/` | User flows in Section 7.4, including refresh and closing the tab |

### Patterns

- Arrange–Act–Assert structure; one behavior per test.
- Test names describe behavior: `it('caps feeding credit at two apples per day')`.
- Use builders in `tests/factories/` (`buildUser`, `buildSession`) instead of hand-written fixtures.
- Control time by passing `now` to domain functions; in integration and component tests use Vitest fake timers. Never `sleep` in tests.
- Integration tests use a dedicated test database and reset it between test files. Do not mock Prisma in integration tests.
- Cover the edge cases in PRD Section 9: refresh, closed tab, second tab, completion before end time, missing token, duplicate completion, midnight crossing, delayed resolution, pagination past 20, input limits.

### Coverage goals

- `src/lib/domain/`: **≥ 95%** lines and branches.
- Overall: **≥ 80%** lines.
- Every acceptance criterion maps to at least one test; list the mapping in the PR description.
- CI fails if coverage drops below these thresholds.

## 7. PRD and design references

<!-- Bridges the PRD and mockups to implementation. -->

### 7.1 Sources of truth

- **PRD:** `docs/PRD.md` — product rules, user stories US1–US8, acceptance criteria, input limits, validation cases.
- **Mockups:** `docs/mockups/` — screen images and prototype link. The mockup decides layout and visual style; the PRD decides behavior. If they conflict, follow the PRD and flag it.
- **API contract:** `docs/openapi.yaml`.

| Story | Title | Area |
| --- | --- | --- |
| US1 | Account access | Accounts |
| US2 | Reset my password | Accounts |
| US3 | Meet my default pet | Pet |
| US4 | View daily feeding progress | Pet |
| US5 | Start a focus session | Focus sessions |
| US6 | Complete a session and earn rewards | Focus sessions |
| US7 | Give up on a session | Focus sessions |
| US8 | Review focus history | History |

### 7.2 Mockup description and visual style

<!-- Keep in sync with docs/mockups/. -->

- **Feel:** calm, friendly, low-distraction. The pet is the emotional center of every authenticated screen.
- **Layout:** single centered column, max width ~480px on mobile and ~720px on desktop. One primary action per screen.
- **Navigation:** top bar with Dashboard, History, Settings; collapses to icons on narrow screens. Hidden during an active session except a link back to the timer.
- **Colors:** use Tailwind theme tokens, not raw hex: `primary` (buttons, progress), `surface` (cards), `danger` (Give up, errors), `success` (completed). Support light and dark mode.
- **Typography:** one sans-serif family; large countdown digits (tabular numerals) on the focus screen.
- **Pet states:** distinct art for Starving (drooping, empty bowl), Hungry (neutral, half bowl), Full (happy, full bowl). Slap animation lasts under one second and respects `prefers-reduced-motion`.

### 7.3 Key UI components

| Component | Location | Expected behavior |
| --- | --- | --- |
| `AuthForm` | `components/AuthForm.tsx` | Email and password fields with inline Zod errors; submit disabled while pending; shows server error message. |
| `PetCard` | `components/PetCard.tsx` | Pet image for current state, name, state label (Starving/Hungry/Full), coin balance, apples today (0–2). |
| `FeedingProgress` | `components/FeedingProgress.tsx` | Bar showing partial minutes toward the next apple (0–25); shows "Full for today" at two apples. |
| `DurationPicker` | `components/DurationPicker.tsx` | Three options only (15, 25, 50) as a radio group; keyboard selectable. |
| `FocusTimer` | `components/FocusTimer.tsx` | Task name, countdown computed from server `endTime` (never a local counter alone), pet, Give up button. Restores on refresh. |
| `GiveUpDialog` | `components/GiveUpDialog.tsx` | Confirmation modal; Cancel keeps the timer running; Confirm abandons and plays the slap animation. Focus trapped while open. |
| `SessionElsewhereNotice` | `components/SessionElsewhereNotice.tsx` | Shown when an active session exists but this tab has no token: "Session running in another tab or closed" with Give up. |
| `SessionResult` | `components/SessionResult.tsx` | Completed: coins and feeding credit earned, new pet state. Abandoned: zero rewards and slap animation. |
| `HistoryList` | `components/HistoryList.tsx` | Newest first, 20 per page, Load more; each row shows task, date, duration, outcome, rewards. Empty state with Start focusing. |
| `ui/*` | `components/ui/` | `Button`, `Input`, `Modal`, `Spinner`, `ErrorMessage`; build screens from these, not one-off styles. |

### 7.4 User flows the agent must follow

1. **Sign up (US1, US3):** Signup form → account and default pet created in one transaction → redirect to Dashboard showing the pet as Starving with 0 coins.
2. **Log in / out (US1):** Login → Dashboard. Logout with an active session → confirm dialog → session abandoned → token removed → Login screen.
3. **Start a session (US5):** Dashboard → Start focusing → Focus screen → task name (optional) → pick duration → Start → server returns session and token → token saved to `sessionStorage` → countdown from `endTime`.
4. **Refresh during a session (US5):** page reloads → `GET /api/sessions/active` → token present in `sessionStorage` → countdown resumes.
5. **Open without the token (US5):** active session but no token → before `endTime`: `SessionElsewhereNotice`; after `endTime`: server resolves as Abandoned → `SessionResult` with slap.
6. **Complete (US6):** countdown reaches zero → client sends completion with the token → server checks token and time, applies rewards once → `SessionResult` → Dashboard reflects new state.
7. **Give up (US7):** Give up → `GiveUpDialog` → Confirm → abandoned, zero rewards, slap → `SessionResult`. If the end time already passed, the server completes the session instead.
8. **History (US8):** History → first 20 sessions → Load more until no more → empty state if none.
9. **Password reset (US2):** Forgot password → email → same confirmation for any email → link → new password → all other sessions signed out → Login.

Every screen handles **loading, error, and empty** states.

## 8. Domain rules (invariants)

<!-- Highest priority. Encode these in lib/domain and test each one. -->

### Sessions

- Durations are exactly `15`, `25`, or `50` minutes.
- One `ACTIVE` session per user, enforced by a partial unique index in PostgreSQL (raw SQL migration if Prisma cannot express it), not only in application code.
- Status values: `ACTIVE`, `COMPLETED`, `ABANDONED`. `COMPLETED` and `ABANDONED` are final.
- `endTime = startTime + duration`, both set by the server.
- Starting a session generates a token with `crypto.randomBytes(32)`; store only its SHA-256 hash. The client stores the token in `sessionStorage` under `onyou.sessionToken` and sends it in the `X-Session-Token` header.
- Completion succeeds only with a valid token **and** `now >= endTime`.
- Abandon (Give up) is allowed before `endTime`; at or after `endTime` the session resolves as completed.
- A request without the token after `endTime` for an uncompleted session resolves it as `ABANDONED`.
- Logout during an active session abandons it after confirmation.
- Never use `beforeunload`, `pagehide`, `localStorage`, or cookies to decide session outcomes.

### Rewards and feeding

- Coins: `durationMinutes` coins per completed session; abandoned sessions earn zero coins, apples, and partial credit.
- Apples: one per 25 credited minutes; at most 2 per feeding day (50 minutes of feeding credit). Partial minutes carry within the same feeding day.
- Coins keep accruing after the pet is Full.
- Feeding state: `0 → STARVING`, `1 → HUNGRY`, `2 → FULL`.
- Feeding day = the session's `endTime` converted to the user's saved IANA timezone, even if resolved later. Late resolution must never credit the current day.
- Daily reset clears apples and partial minutes; coins never reset. Missed days have no penalty.
- Rewards apply **exactly once**: the status change and reward update happen in one transaction with a conditional update (`WHERE status = 'ACTIVE'`), so retries and concurrent requests cannot double-award.
- The server computes all rewards. Never accept reward values from the client.

Reference example (must be a unit test): a pet starting at zero that completes 15 then 10 minutes on the same day has 1 apple, 0 partial minutes, and 25 coins.

### Input limits (shared Zod schemas in `lib/validation/`)

| Field | Rule |
| --- | --- |
| Email | Required, valid format, unique case-insensitive, max 254 characters |
| Password | 8–15 characters |
| Task name | Trimmed, max 80; blank becomes `"Focus session"` |
| Pet name | Trimmed, max 30; blank uses the default pet name |

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
| POST | `/api/sessions/{id}/complete` | US6 |
| POST | `/api/sessions/{id}/abandon` | US7 |
| GET | `/api/sessions` | US8 |

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
- Examples: `test(rewards): cap feeding credit at two apples (#11)`, `feat(sessions): issue hashed session token (#12)`.
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

All acceptance criteria checked, tests written first and passing, coverage thresholds met, OpenAPI updated if the API changed, loading/error/empty states handled, PR approved and merged, issue moved to Done.

## 11. Do's and don'ts

<!-- Quick reference. -->

| Do | Don't |
| --- | --- |
| Put business rules in `lib/domain/` as pure functions | Put reward or feeding math in Route Handlers or components |
| Pass `now` into domain functions | Call `Date.now()` or `new Date()` inside `lib/domain/` |
| Compute the countdown from the server's `endTime` | Trust a client-side counter to decide success |
| Keep the session token in `sessionStorage` | Use `localStorage`, cookies, or `beforeunload` for sessions |
| Validate every input with shared Zod schemas | Validate only in the browser |
| Wrap state change + rewards in one transaction | Update session status and rewards in separate calls |
| Use named constants (`APPLE_MINUTES`) | Hardcode `25`, `50`, or `2` in logic |
| Build screens from `components/ui/` primitives | Write one-off inline styles or new CSS files |
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

Ask before adding any dependency not listed in Section 2.

## 12. Security requirements

<!-- Non-negotiable. -->

- Secrets only in environment variables; keep `.env.example` with names only. Never log or commit secrets.
- Hash passwords with `bcrypt` (cost ≥ 10).
- JWT in an HttpOnly, Secure, SameSite=Lax cookie; never readable by client JavaScript. Include a per-user `tokenVersion`; a password reset increments it to sign out all sessions.
- Session tokens and password-reset tokens are random (`crypto.randomBytes`), stored hashed, and compared in constant time.
- Reset tokens are single-use and expire after 30 minutes; a new request invalidates older tokens.
- Password-reset requests return the same response for unknown emails and are rate-limited per email and per IP, with counters in PostgreSQL.
- Every endpoint authenticates and checks ownership on the server.
- Never return password hashes, token hashes, or internal errors to the client.
- Do not log passwords, tokens, or full JWTs.

## 13. Accessibility requirements

<!-- Target WCAG 2.2 AA. -->

- Semantic HTML: `button` for actions, `a` for navigation, one `h1` per page, landmarks (`header`, `main`, `nav`).
- Every input has a visible `label`; errors are linked with `aria-describedby` and announced with `aria-live="polite"`.
- All interactions work by keyboard with visible focus rings; modals trap focus and close with Escape.
- Text contrast at least 4.5:1; never use color alone to show pet state (always include the text label).
- The countdown exposes remaining time to screen readers without announcing every second (announce at start, each minute, and completion).
- Respect `prefers-reduced-motion` for the slap and pet animations.
- Pet images have descriptive `alt` text, such as "Mochi is hungry".

## 14. Maintaining this file

<!-- Evidence of iteration: every change is logged. -->

- Both partners edit this file. Add a rule in the PR where the need appeared, and keep rules short and testable.
- Remove rules that no longer apply rather than leaving contradictions.

### Change log

| Date | Version | Partner | Change |
| --- | --- | --- | --- |
| 2026-10-27 | 1 | A | Initial draft: stack, structure, conventions, workflow, basic do's and don'ts |
| 2026-10-28 | 2 | A, B | Added domain invariants, layering and `now` injection, strict TDD steps, coverage goals, detailed mockup and component behavior, user flows, API conventions and endpoint list, security and accessibility specifics, priority order |
