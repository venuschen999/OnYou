# AGENTS.md — OnYou

<!--
  Version 5. Cursor loads this file from the project root.
  Product source of truth: PRD v2.9 (`OnYou_PRD_v2_9.md`) and `OnYou_web_mockups.html`.
  This file states invariants and engineering constraints. Screen copy and story detail stay in the PRD, the mockups, and the linked issue.
  When the agent repeats a mistake, add a short rule in that PR and log it in Section 14.
  Do not treat `docs/archive/` or older PRDs as current instructions.
-->

## 0. How to use this file

1. Before a task, read the linked GitHub issue and its user story in `OnYou_PRD_v2_9.md`. Use `OnYou_web_mockups.html` for layout, copy, and pet art.
2. Priority: **Domain rules (Section 8) → Security (Section 12) → the rest of this file → general practice.**
3. If the issue, the PRD, and this file disagree, or a requirement is missing, **stop and ask**. Never invent product behavior. A user-facing label and its internal enum token (Section 4) are both required; that pair is not a disagreement.
4. Stay inside the current issue. Do not refactor unrelated code.

Historical, not instructions: `OnYou_PRD.md`, `OnYou_PRD v2.md`, everything under `docs/archive/`, and `HW3_AGENTS_BASELINE.md` (frozen experiment snapshot; do not edit it).

## 1. Project context

OnYou turns focus time into care for a virtual pet. Every account gets a default pet named **Mochi**. The user names a task, chooses **15, 25, or 50** minutes, and keeps **at least one authenticated OnYou tab connected** until the scheduled end. A completed session earns coins and apples. Giving up, logging out during an Active session, or **30 seconds or more** with no heartbeat earns nothing and plays a short slap.

A focus session belongs to the **account**, not a tab. Every logged-in tab shows the same task, countdown, and outcome. Any authenticated tab of the owner may heartbeat, give up, or request completion.

**Primary users:** students doing self-directed study or work.

**Out of scope — do not build, stub, or scaffold:** partner connections, invite codes, avatars, display names, notifications other than password-reset email, spending coins, shops, food inventory, pause/resume, custom durations, social login, timezone editing, history search or filters, native apps, AI features, WebSockets.

**Obsolete — do not implement:** the PRD v2.0 starting-tab **sessionStorage completion-token** model (`onyou.sessionToken`, `X-Session-Token`, hashed focus-session tokens, `SessionElsewhereNotice`, “only the starting tab can complete”). Presence uses heartbeats, not tab tokens.

## 2. Tech stack and versions

This table is the technical specification. PRD v2.9 §10 names the areas; do not add libraries that are not listed here. Pin upgrades in the PR that changes them.

| Area | Technology |
| --- | --- |
| Language / runtime | TypeScript 5.x (`strict: true`); Node.js 22 LTS. Route Handlers run on Node, never Edge |
| App | Next.js 16.x App Router, Server Components by default; React 19.x function components and hooks; Tailwind CSS 4.x |
| Data | PostgreSQL 16 (Neon; branch per preview); Prisma 6.x (migrations committed with each PR) |
| Auth, validation, email | `jose` (JWT in an HttpOnly cookie), `bcrypt`; Zod 3.x shared by client and server; Resend, password reset only |
| Tests | Vitest 3.x + `@vitest/coverage-v8`; React Testing Library; Playwright 1.x |
| Docs, lint, CI, host | OpenAPI 3.1 and Swagger UI (`docs/openapi.yaml`); ESLint and Prettier; GitHub Actions (lint, typecheck, tests, CodeQL, `npm audit`); Vercel (preview per PR, production from `main`) |

No WebSocket library. Heartbeats are authenticated HTTP `fetch` requests.

Commands: `npm run dev`, `build`, `lint`, `typecheck`, `format`, `test`, `test:integration` (`TEST_DATABASE_URL`), `test:coverage`, `test:e2e`, and `npx prisma migrate dev`. Before reporting done, run lint, typecheck, and the relevant tests, and state the results.

## 3. Architecture

```
src/app/(auth)/      login, signup, forgot-password, reset-password
src/app/(app)/       dashboard (Home), focus, history, settings
src/app/api/         Route Handlers (HTTP only). Pages include loading.tsx and error.tsx
src/components/      feature UI; ui/ = Button, Input, Modal, Spinner, ErrorMessage
src/hooks/           useActiveSession, useCountdown, useHeartbeat
src/lib/domain/      pure rules: no I/O, Prisma, env, or Date.now()
src/lib/server/      Prisma, auth, email; one client from db.ts
src/lib/validation/  Zod shared by forms and handlers
src/lib/api/         typed client fetch helpers
prisma/              schema.prisma, migrations/
tests/               unit/ (mirrors domain), integration/, factories/; e2e/ Playwright
docs/openapi.yaml
```

`useHeartbeat` calls `POST /api/sessions/{id}/heartbeat`. It is not a realtime subsystem. Dependencies point downward only: pages and components → `lib/api` → Route Handlers → validation and server services → domain + Prisma. Domain imports nothing.

- **Thin handlers.** Zod-parse, authenticate, call one service, map to JSON. No business rules in handlers.
- **Pure domain.** Rewards, feeding, presence, and session transitions take `now: Date` and never read the clock.
- **Services own transactions.** Session state and rewards change in one `prisma.$transaction`. Run the shared resolution routine before every session operation (PRD v2.9 §10).
- **Server Components by default.** `'use client'` only for state, effects, or browser APIs.
- **Typed results.** Services return typed results or throw `AppError` with a Section 9 code. Handlers emit the standard error shape.
- **Client.** Keep heartbeats running across OnYou navigation. Prevent overlapping session requests in a tab, and ignore stale responses.

## 4. Naming

| Item | Convention | Example |
| --- | --- | --- |
| Components | `PascalCase.tsx`, named export | `FocusTimer` |
| Hooks | `useCamelCase.ts` | `useHeartbeat.ts` |
| Domain / services | `camelCase.ts`, noun | `rewards.ts`, `sessionService.ts` |
| Functions | verb-first `camelCase` | `calculateRewards`, `renewHeartbeat` |
| Booleans | `is` / `has` / `can` | `hasActiveSession` |
| Constants | `UPPER_SNAKE_CASE` | `APPLE_MINUTES`, `HEARTBEAT_INTERVAL_MS`, `PRESENCE_GRACE_SECONDS` |
| Types | `PascalCase`, no `I` prefix | `RewardResult`, `FeedingState` |
| Zod | `camelCase` + `Schema` | `startSessionSchema` |
| Prisma | singular model, `camelCase` fields | `FocusSession.endTime` |
| Enums | `PascalCase` name, `UPPER_CASE` values in code, Prisma, and JSON | `SessionStatus.ACTIVE` |
| Routes | plural, kebab-case | `/api/sessions/{id}/heartbeat` |
| Env | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_SECRET` |
| Tests | `<module>.test.ts`; e2e `<flow>.spec.ts` | `rewards.test.ts` |

Code, Prisma, and JSON use tokens. Screens use PRD and mockup copy. Do not rename a token to the label, and do not render the token as copy.

| Token | Meaning | Label |
| --- | --- | --- |
| `FeedingState.STARVING` | 0 apples | Starving |
| `FeedingState.HUNGRY` | 1 apple | Hungry |
| `FeedingState.FULL` | 2 apples | Full |
| `SessionStatus.ACTIVE` | in progress, account-owned | Active |
| `SessionStatus.COMPLETED` | final; rewards only if presence was met | Completed |
| `SessionStatus.ABANDONED` | final; zero coins, apples, and feeding minutes | Abandoned |

Sentences and `alt` text follow the mockup, including “Mochi is hungry”. The state-label element is the title-case word.

## 5. Coding standards

- TypeScript `strict`. No `any` or `@ts-ignore`; narrow `unknown`. Exported functions declare parameter and return types. Derive types with `z.infer`. Named exports except Next.js `page.tsx` and `layout.tsx`.
- Functions under ~40 lines; components under ~150. Early returns. No magic numbers: `APPLE_MINUTES`, `MAX_APPLES_PER_DAY`, `DURATIONS = [15, 25, 50]`, `HEARTBEAT_INTERVAL_MS` (10 seconds), `PRESENCE_GRACE_SECONDS` (30).
- Comments say why. Non-obvious rules cite the story: `// US6: credit counts on the scheduled end date`.
- Do not silence an unused parameter with `void param`, an empty assignment, or a dummy read. If the signature requires it, keep it and comment why. Example: `now` stays on a reward function so callers pass the clock, while the feeding day is the session `endTime` (US6). Do not read the parameter only to hide a warning.
- Timestamps are UTC. Convert to the user's IANA timezone only in domain functions that need a feeding day, and in display.

## 6. Testing

TDD is graded: a failing run, then a passing run, then a recorded refactor pass. Writing tests and implementation before any run does not count as red. A first green run with no earlier failing run of those tests has not completed red.

1. **Red.** One or more tests per acceptance criterion. Run them and confirm they fail because the behavior is missing. Commit tests alone: `test: <behavior> (#<issue>)`.
2. **Green.** Minimum code that makes those tests pass. Run them and confirm they pass. Commit: `feat: <description> (#<issue>)`.
3. **Refactor.** Improve structure only, with those tests still the spec. If this pass edits code, commit `refactor: <description> (#<issue>)`. If nothing should change, record that and re-run the tests. Do not add an unrelated edit so a refactor commit exists.

When asked to implement a feature, propose the tests and wait for approval before implementation. Approval does not replace the failing run. The PR records the command, failed or passed counts, and the refactor note. Squash-merge is not used, so `test` then `feat` stay in history (Section 10).

Never delete, skip (`.skip`, `.only`, `.todo`), or loosen an assertion to pass. If a test looks wrong, stop and explain. Never mock the module under test.

| Level | Where | Covers |
| --- | --- | --- |
| Unit (Vitest) | `tests/unit/` | Every `lib/domain/` function: rewards, feeding, cap, feeding day, presence, transitions |
| Component (Vitest + RTL) | beside the component or `tests/unit/components/` | Timer, validation messages, Give up confirmation |
| Integration (Vitest + PostgreSQL) | `tests/integration/` | Handlers: auth, ownership, status, error shape, transactions, duplicates, concurrent heartbeats. Real DB; do not mock Prisma; reset between files |
| E2E (Playwright) | `e2e/` | PRD flows, including refresh, a second tab, and reconnect |

Arrange–Act–Assert; one behavior per test; names describe behavior. Use `tests/factories/` (`buildUser`, `buildSession`). Pass `now` into domain functions; elsewhere use Vitest fake timers. Never `sleep`. Cover PRD v2.9 §11 (tabs, presence boundaries, sleep, network loss, concurrency, duplicate completion, stale Active before start, midnight, delayed resolution, pagination past 20, input limits). Do not write tests that require a focus-session token in `sessionStorage`.

Coverage: `src/lib/domain/` **≥ 95%** lines and branches; overall **≥ 80%** lines. CI fails below that. Map every acceptance criterion to a test in the PR.

## 7. Product references

- **Behavior:** `OnYou_PRD_v2_9.md` (US1 account access, US2 reset password, US3 default pet, US4 daily feeding, US5 start, US6 complete, US7 give up, US8 history; §§5–7, §9 screens, §11 tests). **Layout, copy, and pet art:** `OnYou_web_mockups.html` (desktop 1040px, phone 390px, adapts below 600px). If they conflict, follow the PRD and flag it. **API:** `docs/openapi.yaml`. Every screen has loading, error, and empty states (PRD §9).
- Nav is **Home**, History, Settings, including during an Active session. Other screens show the active session bar (task, time left, end time, Return to session). Start focusing is disabled with “One session at a time”. Tailwind tokens, not raw hex: `primary` (pine), `surface`, `danger` (plum), apple red, `success`. Light and dark mode. One sans-serif; tabular countdown digits. On phones, dialogs are bottom sheets, buttons span the width, the duration-picker pet preview is hidden, and inputs use 16px text.
- Reuse the mockup’s in-code SVG for Starving, Hungry, Full, waiting, and slapped. Do not generate or substitute art. Slap lasts under one second and respects `prefers-reduced-motion`. On-screen words are Starving, Hungry, Full, Completed, and Abandoned (Section 4).
- Build screens from `components/ui/`. Components: `AuthForm`, `PetCard`, `FeedingProgress`, `DurationPicker`, `ActiveSessionBar`, `FocusTimer`, `ConnectionWarning`, `GiveUpDialog`, `SessionResult`, `HistoryList`. Countdown comes from server `endTime`. Login uses one error that does not reveal which field was wrong. Do not add `SessionElsewhereNotice` or any UI that blocks completion for lack of a sessionStorage token.
- Flows are PRD §§5 and 8. Signup creates the account and Mochi in one transaction. Any tab joins via `GET /api/sessions/active` with no session token. Password reset does not abandon an Active session in the reset handler; signing out stops heartbeats (PRD US2).

## 8. Domain rules

Encode these in `lib/domain/` and test each one. Full statement: PRD v2.9 §§5–7.

### Sessions

- Durations are exactly 15, 25, or 50 minutes. `endTime = startTime + duration`, both set by the server, with `lastHeartbeatAt`.
- At most one `ACTIVE` session per account, across tabs and devices, enforced by a partial unique index (raw SQL migration if Prisma cannot express it). `COMPLETED` and `ABANDONED` are final.
- Start records the first heartbeat. Each tab heartbeats on join and every `HEARTBEAT_INTERVAL_MS` (10 seconds) while Active.
- Presence deadline = latest **accepted** heartbeat + `PRESENCE_GRACE_SECONDS` (30). A heartbeat **before** the deadline renews it. If the deadline passes at or before the scheduled end, the session is Abandoned and later heartbeats cannot revive it.
- **Completed** only if not abandoned and the presence deadline is **strictly later** than the scheduled end. Otherwise **Abandoned**.
- Give up before the scheduled end abandons. Give up after the end, when presence was met, completes. Completion before the scheduled end is rejected. Logout during Active asks for confirmation, then abandons on every device.
- The server has no running timer. Resolve on the next request from stored timestamps against the scheduled end, not the request time. Shared routine order: check the scheduled end before a later expiry, and resolve expiry before renewing a heartbeat.
- Every authenticated owning tab may heartbeat, give up, or complete. Never use focus-session tokens, `sessionStorage` completion keys, `X-Session-Token`, `beforeunload`, `pagehide`, `localStorage`, cookies, or WebSockets to decide outcomes.

### Rewards and feeding

- Completed sessions earn `durationMinutes` coins. Abandoned sessions earn zero coins, apples, and feeding minutes.
- Feeding minutes add the duration, capped at 50 per feeding day; extra minutes are discarded. One apple per 25 minutes, at most 2 per day; leftover minutes carry on the same day. Coins keep accruing after Full and never reset. Daily reset clears apples and feeding minutes only. Missed days have no penalty.
- Tokens: `0 → STARVING`, `1 → HUNGRY`, `2 → FULL`. Screens show Starving, Hungry, and Full.
- Feeding day is the session `endTime` in the user’s saved IANA timezone, even if resolved later. Never credit the current day because resolution was late.
- Rewards apply **exactly once**: status and rewards in one transaction with `WHERE status = 'ACTIVE'`. The server computes rewards. Never accept them from the client.
- The PRD v2.9 §6 sequence (complete 15, complete 15, give up 25, complete 25, from zero on one feeding day) is a required unit test. Assert tokens in domain code and labels in rendered copy.

### Input limits

Shared Zod schemas in `lib/validation/`. Reject over-limit input with a clear message; never truncate.

| Field | Rule |
| --- | --- |
| Email | Required, valid format, unique case-insensitive, max 254 |
| Password | 8–15 characters |
| Task name | Trimmed, max 80; blank becomes `"Focus session"` |
| Pet name | Trimmed, max 30; blank uses **Mochi** |

## 9. API conventions

JSON, `camelCase`, ISO 8601 UTC. Success returns the resource (`200`, or `201` on create). Errors: `{ "error": { "code": "SESSION_NOT_FOUND", "message": "…" } }`. Status: `400` validation, `401` unauthenticated, `403` not owner, `404` missing, `409` conflict (active session exists, already resolved), `429` rate limited. Every handler checks ownership. Pagination: `?cursor=<id>&limit=20` → `{ items, nextCursor }`. Endpoint changes update `docs/openapi.yaml` in the same PR. Do not document or implement `X-Session-Token`.

- US1: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`. US2: `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`.
- US3 and US4: `GET /api/pet`, `PATCH /api/pet`. US5: `POST /api/sessions`, `GET /api/sessions/active`, `POST /api/sessions/{id}/heartbeat`.
- US6: `POST /api/sessions/{id}/complete`. US7: `POST /api/sessions/{id}/abandon`. US8: `GET /api/sessions`.

## 10. Scrum and workflow

Board: **Backlog → Sprint Todo → In Progress → In Review → Done**. Move the issue when work starts, when the PR opens, and when it merges. Labels: `feature`, `bug`, `chore`, `docs`, `test`, plus `priority:high`, `priority:medium`, `priority:low`. Milestones: `Sprint 1`, `Sprint 2`. Every issue has a milestone, labels, an estimate, and an acceptance-criteria checklist.

Branch from latest `main`, one issue per branch: `<type>/<issue>-<short-kebab>` with type `feature`, `fix`, `chore`, `docs`, or `test`. Example: `feature/12-start-session-api`.

Commits: `<type>(<optional scope>): <imperative summary> (#<issue>)`. Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`. Summary under 72 characters, imperative, no trailing period. Example: `feat(sessions): record first heartbeat on start (#12)`.

PR title matches a commit. Body: `Closes #<issue>`, summary, acceptance-criteria-to-test mapping, UI screenshots, and an AI-usage note. Merge needs green CI (lint, typecheck, tests, coverage, CodeQL, `npm audit`), a working Vercel preview, and **approval from the other partner**. No squash-merge. Never push directly to `main`.

Follow-ups: `// TODO(#<issue>): …`. Never a TODO without an issue number.

Done means: acceptance criteria checked, red–green–refactor evidence recorded (Section 6), tests and coverage met, OpenAPI updated if the API changed, loading/error/empty states handled, PR approved and merged, issue in Done.

## 11. Do's and don'ts

| Do | Don't |
| --- | --- |
| Put reward, feeding, and presence rules in `lib/domain/` | Put that math in handlers or components |
| Pass `now` into domain functions; comment an unused `now` | Call `Date.now()` or `new Date()` in `lib/domain/`, or silence a parameter with `void` |
| Count down from server `endTime`; heartbeat every 10s from every open authenticated tab, including across navigation | Decide success from a local counter, or use `sessionStorage` tokens, `X-Session-Token`, `SessionElsewhereNotice`, `localStorage`, cookies, `beforeunload`, or WebSockets for presence |
| Validate with shared Zod schemas on the server | Validate only in the browser, or truncate over-limit input |
| Change status and rewards in one conditional transaction | Award twice, or accept reward amounts from the client |
| Use named constants and `components/ui/` plus mockup SVG | Hardcode `25`, `50`, `2`, `10`, or `30`, or generate pet art |
| Ask when a requirement is missing; stay in the issue | Invent behavior, stub out-of-scope features, or refactor unrelated files |

Dependencies not in Section 2 need approval. Prefer Tailwind, Zod, Prisma (raw SQL only when a migration must), `jose`, `bcrypt`, `fetch`, `Intl`, and React state. Avoid CSS-in-JS, Yup, `jsonwebtoken`, Axios, Moment, Redux, and WebSockets.

## 12. Security

- Secrets only in environment variables. `.env.example` lists names only. Never log or commit secrets, passwords, reset tokens, or full JWTs.
- Hash passwords with `bcrypt` (cost ≥ 10).
- JWT in an HttpOnly, Secure, SameSite=Lax cookie, unreadable by client JavaScript. Include a per-user `tokenVersion`; password reset increments it and signs out every session.
- Reset tokens are `crypto.randomBytes`, stored hashed, compared in constant time, single-use, and expire after 30 minutes. A new request invalidates older tokens. Do not create hashed tokens for focus-session completion.
- Unknown emails get the same reset response. Rate-limit per email and per IP with counters in PostgreSQL.
- Every endpoint authenticates and checks ownership. Heartbeat, complete, and abandon require the owner. They do not use a tab-scoped session token.
- Never return password hashes, reset-token hashes, or internal errors.

## 13. Accessibility

Target WCAG 2.2 AA.

- Semantic HTML: `button` for actions, `a` for navigation, one `h1` per page, landmarks (`header`, `main`, `nav`).
- Visible `label` on every input. Errors use `aria-describedby` and `aria-live="polite"`.
- Keyboard access with visible focus. Modals trap focus and close with Escape. Phone confirmations are bottom sheets.
- Contrast at least 4.5:1. Pet state is never color alone; include the text label.
- The countdown is announced at start, each minute, and completion, not every second.
- Respect `prefers-reduced-motion` for slap and pet motion. Pet `alt` text follows the mockup, such as "Mochi is hungry".

## 14. Maintaining this file

Both partners edit this file. Add a short, testable rule in the PR where the need appeared. Remove rules that no longer apply. Do not edit `HW3_AGENTS_BASELINE.md`. Refinements after that snapshot belong here and must rest on experimental observations (`HW3_Rules_Refinement_Report.md`). Previous full copies live under `docs/archive/rules/` and are not current instructions.

| Date | Version | Partner | Change |
| --- | --- | --- | --- |
| 2026-10-27 | 1 | A | Initial draft: stack, structure, conventions, workflow |
| 2026-10-28 | 2 | A, B | Domain invariants, `now` injection, TDD, coverage, mockups, API, security, accessibility |
| 2026-10-27 | 3 | B | PRD v2.9: account-owned sessions, heartbeats, mockups, Mochi; ban sessionStorage completion tokens |
| 2026-10-27 | 4 | B | After Issue #11: token vs label map; red–green–refactor evidence; no no-op unused parameters |
| 2026-10-28 | 5 | B | Condensed. Invariants and v4 refinements kept; duplicated PRD and mockup detail now linked |
