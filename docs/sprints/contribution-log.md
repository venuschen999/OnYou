# Contribution log

This log summarizes `main` at `531ec68` (2026-11-15) for **CollinsCao** and **venuschen999**. Counts come from `git log` and the GitHub issue and pull-request APIs. It is not a signed statement by either partner. **Requires confirmation** from both people before it is treated as the submission's contribution log.

Commit counts are non-merge commits on `main` whose author name matches. They do not include merge commits or Dependabot.

| | CollinsCao | venuschen999 |
| --- | ---: | ---: |
| Non-merge commits on `main` | 45 | 54 |
| Commits whose subject starts with `test` | 17 | 16 |
| Commits whose subject starts with `feat` | 11 | 10 |
| Commits whose subject starts with `docs` | 7 | 16 |
| Commits whose subject starts with `ci`, `chore`, `fix(ci)`, or `fix(deps)` | 9 | 2 |

The prefix rows do not add up to the total. Refactor and other fix commits sit outside those prefixes.

Dependabot merged #42, #43, #45, #46, #47, and #48. Those commits are not counted for either partner. venuschen999 submitted the approvals on #42, #43, #45, #47, and #48. #46 merged without a venuschen999 review in the review list retrieved for this log.

## CollinsCao

Git author on `main`: Collins Cao. Planning role in the Scrum setup report: Team Member B.

### Assigned issues

Current assignees, including the joint issue:

#2, #3 (with venuschen999), #4, #7, #12, #13, #14, #15, #16, #20, #22, #23, #26, #27, #29.

#21 and #30 are not assigned to CollinsCao.

### Implemented features

| Issue | What merged | PR |
| --- | --- | --- |
| #12 | `POST /api/sessions`, one active session, first heartbeat | #40 |
| #13 | Focus screen, countdown from server `endTime`, heartbeats across navigation | #50 |
| #14 | Heartbeat route and presence resolution | #41 |
| #15 | Completion, presence check, exactly-once rewards | #53 |
| #16 | Result screen for coins, feeding minutes, and apples | #55 |
| #20 | Home dashboard for Starving, Hungry, and Full, loading `GET /api/pet` | #59 |
| #22 | History API, newest first, 20 per page | #56 |
| #23 | History screen, empty state, Load more | #57 |

### Other merged pull requests

| PR | Issue | Kind |
| --- | --- | --- |
| #34 | #2 | CI: lint, typecheck, unit tests, coverage, integration tests with PostgreSQL 16 |
| #37 | #7 | OpenAPI skeleton and Swagger UI |
| #38 | #4 | CodeQL, `npm audit`, Dependabot |
| #54 | #3 | Vercel and Neon migration URL. PR #39, also by CollinsCao, was closed without merging. |
| #58 | #29 | README setup and deployment guide |
| #65 | #27 | OpenAPI for the shipped endpoints |
| #67 | #26 | Full-loop Playwright tests |

### Testing

Seventeen `test` commits on `main`, including session start, heartbeat, completion, focus, dashboard, and history. PR #67 adds `e2e` coverage for complete, give up, a second tab, and history. PR #59 records the dashboard red run (7 failed) and the later green run.

### Documentation

OpenAPI (#7, #27), README and the deployment guide linkage (#29), deployment notes in #54, and the `AGENTS.md` commits on `main` (`0ad5325`, `81d317c`). Both of those `AGENTS.md` commits are authored by Collins Cao. The version table inside `AGENTS.md` also names Partner A. There is no `venuschen999` commit that touches `AGENTS.md` on `main`.

### CI/CD

Issues #2, #3, and #4, and the merged pulls #34, #38, and #54. Conversation comment on PR #38 (2026-11-06) records the CodeQL pass and the `npm audit` vulnerability count at that time.

### Formal GitHub reviews submitted

| PR | When | Review |
| --- | --- | --- |
| #51 | 2026-11-11 | APPROVED, empty body |
| #52 | 2026-11-11 | APPROVED, empty body |

That is two submitted reviews. The assignment target cited in the product docs is five per partner. Conversation comments on #54, #57, #58, #60, #61, #63, and #64 are not submitted reviews. Some of those comments are substantive (#54, #58, issue #22). Others are short approvals in the comment thread ("Looks good" on #61, #63, and #64).

## venuschen999

Git author on `main`: venuschen999. Planning role in the Scrum setup report: Team Member A.

### Assigned issues

#1, #3 (with CollinsCao), #5, #6, #8, #9, #10, #11, #17, #18, #19, #21, #24, #25, #28, #30.

#21 and #30 are still open. No pull request is merged for either one.

### Implemented features

| Issue | What merged | PR |
| --- | --- | --- |
| #1 | Next.js scaffold, Tailwind, ESLint, Prettier | #31 |
| #5 | Prisma schema and the first migration | #32 and #33 |
| #8 | Signup and login API, bcrypt, JWT cookie, Zod, Mochi created with the account | #35 |
| #9 | Auth screens and protected routes | #36 and #51 |
| #10 | Pet rename in Settings, `PATCH /api/pet` | #68 |
| #11 | Reward, apple, cap, and feeding-day functions | #52 |
| #17 | Give up confirmation, abandon API, slap result | #61 |
| #18 | Logout confirmation abandons the active session | #66 |
| #19 | `GET /api/pet` feeding progress and daily reset by timezone | #62 |
| #24 | Password-reset request, Resend, hashed token, rate limits | #63 |
| #25 | Reset screens and confirm API, `tokenVersion` increment | #64 |

### Other merged pull requests

| PR | Issue | Kind |
| --- | --- | --- |
| #60 | #6 | Playwright smoke tests in CI |

### Testing

Sixteen `test` commits on `main`, including auth, rewards, pet progress, pet rename, give up, and password reset. PR descriptions for #6, #10, #17, #18, #19, #24, and #25 record a failing run before the implementation commit. PR #60 adds the CI job that runs Playwright against a production build and a throwaway PostgreSQL 16 service.

### Documentation

Sixteen `docs` commits on `main`. These include the decision logs under `docs/agent-memory/` that landed with the feature pulls, screenshots under `docs/screenshots/`, and the Homework 3 reports that are already on `main`. Issue #28 was closed with an architecture image on the issue. The diagram files under `docs/diagrams/` were not on `main` at `531ec68`. They are added in the documentation pull request that introduces this log.

### CI/CD

The Playwright job in #60. Formal approvals on the Dependabot workflow and library bumps #42, #43, #45, #47, and #48. Formal approvals on CollinsCao's deployment pull #54 and README pull #58.

Vercel project `onyou123` and its Neon database are on Venus's Vercel account, as stated in `docs/deployment.md`. This log does not have access to that dashboard beyond the GitHub deployment records and that document.

### Formal GitHub reviews submitted

| PR | When | Review |
| --- | --- | --- |
| #42, #43, #45, #47, #48 | 2026-11-11 | APPROVED. Each body is "Reviewed: CI green, change limited to the dependency bump." |
| #54 | 2026-11-15 | APPROVED. Names the migration URL helper, tests, `vercel-build`, docs, green checks, and a preview signup through to Home. |
| #58 | 2026-11-15 | APPROVED. Names the README setup, environment, script, and deployment sections, and green checks. |

That is seven submitted reviews. Five of them are the Dependabot sentence. Two of them review partner work (#54 and #58).

The only venuschen999 conversation comment found on a pull request, other than those reviews, is on closed PR #39: "Superseded by #54, which configures Prisma 7 migrations through prisma.config.ts and is merged." A separate comment on issue #3 says the production deployment from `main` completed.

## Shared work

Issue #3 is assigned to both accounts. The merged code is PR #54 by CollinsCao. Venus approved it and hosts the Vercel project named in `docs/deployment.md`.

`AGENTS.md` section 14 says Partner A wrote version 1, both partners wrote version 2, and Partner B wrote versions 3 through 6. The git history on `main` shows only Collins Cao as the author of commits that change that file. **Requires confirmation** of how Partner A's edits were committed.

## What this log does not claim

- It does not assign story points. None are stored on the issues.
- It does not list standups. None were found in GitHub or in the markdown on `main`.
- It does not include a demo recording or individual reflections. Those were not in the repository.
- It does not treat #21 or #30 as finished.
