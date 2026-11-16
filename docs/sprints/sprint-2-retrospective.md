# Sprint 2 retrospective

Written on 2026-11-15 from the GitHub record for milestone **Sprint 2** (milestone 2). This file is not a transcript of a meeting. Nobody checked in a Sprint 2 retrospective before this document.

## Sprint goal

The milestone description says: feeding dashboard, history, password reset, docs, polish. The agreed schedule on the milestone is a start of 2026-11-03 and a due date of 2026-11-11 (`2026-11-11T00:00:00Z`). The planned issues are #19–#30.

## Completed issues

Twelve of the fourteen Sprint 2 issues are closed. All of those closes are after the 2026-11-11 due date. `closedAt` is UTC. Timestamps on 2026-11-16 UTC are the evening of 2026-11-15 in America/Los_Angeles.

| Issue | Assignee | State | Closed (UTC) | Merged PR |
| --- | --- | --- | --- | --- |
| #19 Feeding progress API | venuschen999 | Closed | 2026-11-16 | #62 |
| #20 Dashboard UI | CollinsCao | Closed | 2026-11-16 | #59 |
| #21 Midnight and late resolution | venuschen999 | **Open** | — | No pull request |
| #22 History API | CollinsCao | Closed | 2026-11-16 | #56 |
| #23 History screen | CollinsCao | Closed | 2026-11-16 | #57 |
| #24 Password-reset request | venuschen999 | Closed | 2026-11-16 | #63 |
| #25 Reset-password screen | venuschen999 | Closed | 2026-11-16 | #64 |
| #26 Full-loop E2E | CollinsCao | Closed | 2026-11-16 | #67 |
| #27 OpenAPI for shipped endpoints | CollinsCao | Closed | 2026-11-16 | #65 |
| #28 Architecture and schema diagrams | venuschen999 | Closed | 2026-11-16 | No documentation pull request at the time it was closed |
| #29 README and deployment guide | CollinsCao | Closed | 2026-11-15 | #58 |
| #30 Accessibility and responsive pass | venuschen999 | **Open** | — | No pull request |

The milestone is still `open`.

## Actual accomplishments

On `main` at `531ec68`:

- `GET /api/pet` returns today's apples, feeding minutes, coins, and feeding state. Home renders Starving, Hungry, and Full from that payload (PR #59, after a first dashboard commit that did not yet call `GET /api/pet`).
- History is newest-first, 20 per page, owner-scoped, with an empty state and Load more.
- Password reset asks Resend to send mail, stores only a SHA-256 token hash, rate-limits in PostgreSQL, and confirmation increments `tokenVersion` so existing JWTs stop working.
- Playwright covers signup, a completed session, give up, a second tab, and history (`e2e/full-loop.spec.ts`, `e2e/dashboard.spec.ts`, `e2e/smoke.spec.ts`).
- `docs/openapi.yaml` documents the shipped auth, pet, and session routes. Swagger UI is `/docs`.
- README setup and deployment instructions landed in #58. The feature-status paragraph in that README was already stale by the later merges on 2026-11-16. This documentation change corrects that paragraph.
- Production URL https://onyou123.vercel.app is the repository homepage. GitHub records a successful Production deployment of `531ec68` by `vercel[bot]`.

## What #21 and #30 do not include

Issue #21 is open and its four acceptance checkboxes are unchecked. `getFeedingDay` in `src/lib/domain/feedingDay.ts` already derives the calendar day from the session `endTime`, and `tests/unit/domain/feedingDay.test.ts` covers midnight and a late-resolved instant. Those tests arrived with issue #11. There is no merged pull request that closes #21, so this retrospective does not call #21 done.

Issue #30 is open. Its five acceptance checkboxes are unchecked. Individual screens already have labels, a modal focus trap, and loading or error files from earlier issues. The accessibility and responsive pass itself has no pull request.

## Issue #28

Issue #28 was closed at 2026-11-16T02:34:44Z, the same minute as Venus's comment that attaches one image with alt text "architecture". The issue's four checkboxes were still unchecked. The acceptance criteria ask for both diagrams under `docs/`, including `User`, `Pet`, `FocusSession` with `lastHeartbeatAt`, and `DailyFeeding`. `main` at `531ec68` has no `docs/diagrams/` directory. README even said the repository did not include a separate diagram file.

This change adds [the architecture diagram](../diagrams/architecture.md) and [the database schema diagram](../diagrams/database-schema.md). Closing #28 did not, by itself, put those files on `main`.

## Technical challenges

- PR #25 records that the first Vercel preview failed before the build with "Branch limit reached" on the Neon free plan. The same write-up says deleting preview branches for already merged pulls #54 and #58 allowed the redeploy to succeed.
- PR #59 records a red run of `dashboardPage.test.tsx` (7 failed, 2 passed) because Home did not yet call `GET /api/pet`, then a green run after that call. The pull request says there was no separate refactor commit.
- PR #23's history screen records a red run because the page never called `GET /api/sessions`, then a green run. Coverage cited there is 80.85% lines, domain lines 100%, domain branches 98.55%. PR #59, after the dashboard load, cites 82.20% lines, domain lines 100%, domain branches 98.88%. Those figures are the pull request reports, not a new measurement for this document.
- PR #56 says the history list of a given-up session passed on the first run after merging Give up, because both behaviors were already implemented. That is a case where a new test did not start from a failure of missing behavior.
- Local Docker PostgreSQL was still unavailable for integration tests on the password-reset pulls. CI ran them. That is stated in the bodies of #24 and #25.

## Collaboration observations supported by evidence

- Sprint 2 assignees on the open and closed issues match the planning split: CollinsCao owns #20, #22, #23, #26, #27, and #29. venuschen999 owns #19, #21, #24, #25, #28, and #30.
- venuschen999 approved PR #58 (README) on 2026-11-15 with a written note that the setup, environment, script, and deployment sections matched the repository and the Vercel/Neon setup from #54. venuschen999 approved PR #54 the same day after checking the migration helper, tests, preview build, and a preview signup through to Home.
- CollinsCao's conversation comments on Sprint 2 pulls are not formal reviews. Examples that are actually in GitHub: a verification note on #58, "Looks good" on #63 and #64, a reopen note on #57, and a verification note on issue #22 after PR #56 merged. No submitted review from CollinsCao appears on #56, #57, #59, #62, #63, #64, #65, #66, #67, or #68.
- Both partners continued to commit after the due date. The 2026-11-15 and 2026-11-16 merges are the bulk of Sprint 2.

## What the record does not contain

**Requires confirmation** if any of this happened outside GitHub:

- A Sprint 2 planning meeting other than the milestone text written when the issues were created.
- Three standups per partner during 2026-11-03 through 2026-11-11, or during the later merge window. No standup note is in the issues, pull requests, or markdown.
- A live retrospective conversation. This file was compiled from the API and the git log.
- Estimates for #19–#30.
- A 10-minute demo video, a partner contribution log, or individual reflections. Those files were not in the repository at `531ec68`. The contribution log added beside this retrospective is a summary of git and GitHub objects. It is not a statement that each partner has signed it. **Requires confirmation** from both partners.

## What worked

- Password reset, history, the dashboard, and the fuller end-to-end tests landed with failing tests recorded in the pull requests for #19, #20, #23, #24, and #25.
- OpenAPI was updated in the same period as the new routes, in #27, and the spec on `main` lists the shipped operations including heartbeat, complete, abandon, and both password-reset routes.
- Preview deployments and the production deployment exist as GitHub deployment records. The public production host responds. The login page and `/docs` were reachable on 2026-11-15.
- Decision notes in `docs/agent-memory/` record product choices for auth, pet, rewards, sessions, and deployment instead of leaving them only in chat.

## What should improve

- Do not close a documentation issue when the files it names are not on the branch. #28 is the example.
- Finish #21 and #30, or keep them open and visible. The milestone due date has passed with both still open.
- Replace stale status text when later pulls land. The README paragraph from #29 still said Home, History, Settings, password reset, logout, rename, Give up, and history were unfinished after those pulls had merged.
- Write partner reviews on feature pulls. The Sprint 2 feature list merged with Venus's written review on the README and with Collins's comments that were not submitted reviews.
- Check acceptance criteria. Among issues #1–#30, only #22 had its boxes checked.

## Action items

These follow from the repository gaps. They were not assigned in a meeting.

1. Keep #21 and #30 open until their acceptance criteria are met. #21 still needs its own closing pull request even though feeding-day unit tests exist from #11.
2. Each partner confirms or corrects [the contribution log](contribution-log.md). **Requires confirmation.**
3. Record the 10-minute demo from [the demo script](../demo/demo-script.md). The script does not claim a video exists.
4. Each partner writes their own reflection. This repository does not contain one, and this retrospective does not invent one.
5. Add any real standup notes the team still has. If there are none, say so when the project is submitted.
6. Close milestone Sprint 2 only after #21, #30, and the documentation the submission requires are actually done. **Requires confirmation** before anyone closes it.
