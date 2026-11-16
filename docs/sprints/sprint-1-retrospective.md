# Sprint 1 retrospective

Written on 2026-11-15 from the GitHub record for milestone **Sprint 1** (milestone 1). This file is not a transcript of a meeting. Nobody checked in a Sprint 1 retrospective before this document.

## Sprint goal

The milestone description says: foundation, auth, focus sessions, complete/abandon. The agreed schedule recorded on the milestone is a start of 2026-10-24 and a due date of 2026-11-02 (`2026-11-02T00:00:00Z`). The planned issues are #1–#18. The same schedule is in [the Scrum setup report](../hw3/HW3_Scrum_Setup_Report.md).

## Completed issues

All 18 Sprint 1 issues are closed. GitHub `closedAt` is UTC. A timestamp on 2026-11-16 UTC is still the evening of 2026-11-15 in America/Los_Angeles. Every close below is after the 2026-11-02 due date.

| Issue | Assignee | Closed (UTC) | Merged PR |
| --- | --- | --- | --- |
| #1 Scaffold | venuschen999 | 2026-11-04 | #31 |
| #2 CI pipeline | CollinsCao | 2026-11-10 | #34 |
| #3 Vercel and Neon | CollinsCao, venuschen999 | 2026-11-15 | #54. PR #39 was closed without merging. |
| #4 Security scanning | CollinsCao | 2026-11-10 | #38 |
| #5 Prisma schema and migration | venuschen999 | 2026-11-04 | #32 and #33 |
| #6 Playwright smoke test | venuschen999 | 2026-11-16 | #60 |
| #7 OpenAPI skeleton | CollinsCao | 2026-11-09 | #37 |
| #8 Signup and login API | venuschen999 | 2026-11-09 | #35 |
| #9 Auth screens | venuschen999 | 2026-11-11 | #36 and #51 |
| #10 Default pet and rename | venuschen999 | 2026-11-16 | #68 |
| #11 Reward calculation | venuschen999 | 2026-11-11 | #52 |
| #12 Start-session API | CollinsCao | 2026-11-10 | #40 |
| #13 Focus screen | CollinsCao | 2026-11-11 | #50 |
| #14 Heartbeat and presence | CollinsCao | 2026-11-10 | #41 |
| #15 Completion and rewards | CollinsCao | 2026-11-11 | #53 |
| #16 Result screen | CollinsCao | 2026-11-11 | #55 |
| #17 Give up | venuschen999 | 2026-11-16 | #61 |
| #18 Logout abandons the active session | venuschen999 | 2026-11-16 | #66 |

The milestone is still `open` in the GitHub API even though every issue in it is closed.

## Actual accomplishments

By the time those pulls merged, `main` had:

- A Next.js 16, TypeScript, Tailwind, ESLint, and Prettier app, plus `AGENTS.md`.
- PostgreSQL tables for users, pets, focus sessions (including `lastHeartbeatAt`), and daily feeding, with the one-active-session partial unique index.
- GitHub Actions jobs for lint, typecheck, unit tests, coverage, and integration tests against PostgreSQL 16. CodeQL, `npm audit`, and Dependabot followed in #4.
- Signup and login with bcrypt and a JWT in an HttpOnly cookie, auth screens, and route protection.
- Pure reward and feeding-day functions.
- Start, heartbeat, completion, and the result screen.
- Vercel project `onyou123` and Neon, merged in #54 on 2026-11-15. Preview signup to Home is recorded in `docs/deployment.md` and in Venus's approval on PR #54.

Give up (#17), logout-during-session (#18), pet rename (#10), and the Playwright job (#6) are Sprint 1 issues that merged on 2026-11-16 UTC, in the same window as Sprint 2 work.

## Technical challenges

These are taken from commits and pull requests, not from memory of a conversation.

- Prisma 7 does not keep the database URL in `schema.prisma`. PR #39 was closed without merging. Venus's comment on 2026-11-15 says it was superseded by #54, which points migrations at `DATABASE_URL_UNPOOLED` through `prisma.config.ts`.
- Collins's comment on PR #38 (2026-11-06) records that CodeQL passed and that `npm audit` then reported 14 vulnerabilities (9 moderate, 3 high, 2 critical). Later dependency pulls and `fix(deps): patch Zod, Prisma, and Vitest advisories (#4)` are the follow-up visible on `main`.
- Issue #14's branch commits the heartbeat implementation in `11e0378` and only then adapts tests in `b6aa61b`. That order does not match the test-then-implementation order used on #12, #13, and #15.
- Several pull requests, including #17, #24, and #25, say integration tests were not run on a laptop because local Docker PostgreSQL was not running, and that CI ran them instead.
- `docs/deployment.md` still leaves "Verify a Production Deployment from `main`" unchecked. A later comment on issue #3 (venuschen999, 2026-11-15) says the production deployment completed, and GitHub records a successful Production deployment of `531ec68`. The checklist file and the deployment record disagree. This retrospective does not change that checklist.

## Collaboration observations supported by evidence

- The Scrum setup report says the team confirmed the sprint dates. Both GitHub accounts are assignees. Non-merge commits on `main` at `b08f70d`: Collins Cao 45, venuschen999 55. Venus's added commit is `06a26ca`, integration coverage for feeding-day credit. It does not change Sprint 1 product code.
- Formal submitted reviews during this work are sparse. CollinsCao approved PR #51 and PR #52 on 2026-11-11. Both review bodies are empty. venuschen999 approved five Dependabot pulls (#42, #43, #45, #47, #48) on 2026-11-11 with the sentence "Reviewed: CI green, change limited to the dependency bump." Those five pulls merged on 2026-11-11, inside the late Sprint 1 window. Venus's reviews of #54 and #58 are dated 2026-11-15 and are listed in the Sprint 2 retrospective because those pulls are the deployment and README issues, and #3 itself closed on 2026-11-15.
- Collins left a review-style conversation comment on #54 and short "Looks good" comments on #60 and #61. Those are issue comments, not submitted GitHub reviews.
- The project board is https://github.com/users/CollinsCao/projects/3. The setup report says GitHub rejected a formal link because the project owner is CollinsCao and the repository owner is venuschen999. Whether the board columns were moved for each Sprint 1 issue is not in the repository. **Requires confirmation.**

## What the record does not contain

**Requires confirmation** if any of this happened outside GitHub:

- A sprint planning meeting beyond the milestone text and the setup report.
- Three standups per partner. A search of issues, pull requests, and repository markdown found no standup note.
- Task estimates. Issue bodies have priorities and acceptance criteria. They do not have hours or story points. `table.tsv` has no estimate column.
- Partner feedback beyond the reviews and comments named above.

Acceptance-criteria checkboxes were left unchecked on the closed Sprint 1 issues. The criteria text is present.

## What worked

- The 18 issues existed before implementation, with milestones, labels, assignees, and acceptance criteria.
- Most feature branches commit tests before the implementation commit. Pull requests for #8, #11, #12, #13, and #15 show that order. Later Venus pulls also record the failing run.
- CI on pull requests to `main` runs lint, types, unit tests, coverage, and PostgreSQL integration tests. Security workflows are separate and also run on pull requests.
- Signup creates the account and Mochi together, and the session rules live in `src/lib/domain` rather than in React components.

## What should improve

- The due date passed before the first Sprint 1 issue closed. The milestone should be closed only after the team agrees the sprint record is complete, and the calendar slip should stay visible.
- Submit a GitHub review on the partner's pull request. Empty approvals and Dependabot one-liners leave the feature pulls without a written partner review.
- Keep the test commit ahead of the implementation commit, including on follow-on work like #14.
- Check the acceptance boxes when the pull request merges, or point each box at a test in the pull request and then check it.
- Put diagrams and retrospectives in the repository. Issue #28 was a Sprint 2 issue and is covered there. Sprint 1 had no retrospective file until this one.

## Action items

These follow from the gaps above. They were not assigned in a meeting.

1. Confirm whether Sprint 1 standups exist outside the repository. If they do, add them under `docs/sprints/`. If they do not, leave this section as the record of that absence.
2. CollinsCao submits written GitHub reviews on partner feature pulls until the formal-review count is unambiguous. venuschen999's Dependabot approvals should not be the only written reviews of the sprint.
3. Leave the #14 commit order as history. Do not rewrite it. Use test-then-implementation on any remaining work.
4. Close milestone Sprint 1 after the team accepts this retrospective. **Requires confirmation** before anyone closes it.
