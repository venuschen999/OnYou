# HW3 AGENTS.md Simplification Report

**Date:** 2026-10-28  
**Live rules updated:** `AGENTS.md` (version 4 → version 5)  
**Report added:** `HW3_AGENTS_Simplification_Report.md`  
**Sources read:** `AGENTS.md` (version 4, preserved at `docs/archive/rules/AGENTS_v3_before_simplification.md`), `OnYou_PRD_v2_9.md`, `OnYou_web_mockups.html`, `HW3_Before_After_Results.md`, `HW3_Rules_Refinement_Report.md`  
**Not modified:** archived rules, `HW3_AGENTS_BASELINE.md`, `HW3_AGENTS_pre_v2_9.md`, hidden tests, BEFORE and AFTER implementations, GitHub Issues, sprint milestones, and the project board. No application code. No commit and no push.

The repository has no separate rubric file. This check uses the rules-file requirements for this assignment: the essential sections, the v2.9 session and reward invariants, and the three Issue #11 refinements in `HW3_Rules_Refinement_Report.md`.

## 1. Line count

Counted with Python `splitlines()` on files that both end in a newline. `wc -l` matches.

| File | Lines |
| --- | ---: |
| Version 4, archived as `docs/archive/rules/AGENTS_v3_before_simplification.md` | 502 |
| Version 5, live `AGENTS.md` | 247 |

247 is inside the 150–250 target. The live file is 255 lines shorter (about 49% of the version 4 length).

Version 4’s SHA-256 before this edit was `123d61c4b62150005f5d0044916c7e77524cb2e23253f33fa460cf26a3609c89`, which still matches the archive copy.

## 2. What changed

Version 5 keeps the same section numbers (0–14) so the priority order, the Issue #11 citations, and the change log still point at the same places. Wording is shorter. Product detail that already lives in PRD v2.9 or the mockups is cited instead of copied.

| Version 4 material | Version 5 |
| --- | --- |
| Nine user-flow narratives (§7.4) | Pointer to PRD §§5 and 8, plus the traps that are easy to miss: signup creates the account and Mochi in one transaction; any tab joins through `GET /api/sessions/active`; the reset handler does not abandon an Active session |
| Component behavior table (§7.3) | Component names and the constraints that are engineering rules: countdown from server `endTime`, build from `components/ui/`, reuse mockup SVG, no `SessionElsewhereNotice`. Screen copy stays in PRD §9 and the mockup |
| Per-row tech-stack notes and the command block | One grouped stack table, including versions, and one command sentence |
| Folder tree with inline comments, plus a four-line layering diagram | Shorter tree and one layering sentence. The downward dependency rule is unchanged |
| Preferred-dependency table | One sentence under Do’s and Don’ts: libraries in Section 2, and the same avoid-list |
| Thirteen-row endpoint table | Three bullets that still name every method and path |
| PRD §6 numeric walkthrough copied in full | Required unit test, cited to PRD v2.9 §6 (complete 15, complete 15, give up 25, complete 25, from zero on one feeding day). Domain assertions stay on `STARVING` / `HUNGRY` / `FULL`; rendered assertions stay on Starving, Hungry, and Full |
| Do’s and Don’ts rows that repeated other sections | Seven-row table of the constraints agents most often violate |

The feeding-day numbers were not recalculated. The sequence is the PRD §6 table. Tests still have to assert tokens in domain code and labels in rendered copy, which is the version 4 refinement.

## 3. Rules-file requirements

| Requirement | Where it lives in version 5 | Result |
| --- | --- | --- |
| Project overview and target users | §1. Students; Mochi; 15/25/50; out-of-scope list | Kept |
| Tech stack and versions | §2. TypeScript 5 strict, Node 22 (not Edge), Next.js 16, React 19, Tailwind 4, PostgreSQL 16 / Neon, Prisma 6, `jose`, `bcrypt`, Zod 3, Resend, Vitest 3, RTL, Playwright 1, OpenAPI 3.1 + Swagger UI, ESLint, Prettier, GitHub Actions, Vercel | Kept |
| Architecture and folders | §3. Paths, layering, thin handlers, pure domain, transactions, one Prisma client, Server Components, `AppError` | Kept |
| Naming and coding standards | §4 and §5. Including the token/label table and the unused-parameter rule | Kept |
| Testing and coverage | §6. Red, green, and a recorded refactor; propose tests first; no skip, loosen, or mock of the module under test; ≥ 95% domain lines and branches; ≥ 80% overall | Kept |
| PRD and mockup references | §0 and §7. `OnYou_PRD_v2_9.md`, `OnYou_web_mockups.html`, `docs/openapi.yaml`. Mockup wins layout; PRD wins behavior | Kept |
| Session and heartbeat architecture | §1 and §8. Account-owned; one `ACTIVE` session; partial unique index; 10-second heartbeats; 30-second presence deadline; equal tab authority | Kept |
| Reward invariants | §8. Coins, 50-minute cap, 25 minutes per apple, max 2, exactly-once `WHERE status = 'ACTIVE'`, feeding day from `endTime` | Kept |
| Security | §12. Unchanged obligations; see §4 below | Kept |
| Accessibility | §13. WCAG 2.2 AA; see §4 below | Kept |
| Scrum, branches, commits, PR review | §10. Board columns, labels, Sprint 1 and Sprint 2, branch and commit formats, partner approval, no squash-merge, no direct push to `main` | Kept |
| Do’s and Don’ts | §11 | Kept |
| Priority and stop-and-ask | §0. Domain rules, then security, then the rest of this file. A token and its label are not a conflict | Kept |
| Archived files are not instructions | Header, §0, and §14 | Added as an explicit rule |

## 4. Business and security invariants

Checked by reading version 5 against PRD v2.9 §§5–7 and §10 and against version 4 §§8 and 12.

| Invariant | Preserved wording |
| --- | --- |
| Account-owned sessions | “A focus session belongs to the **account**, not a tab.” Any authenticated owning tab may heartbeat, give up, or complete |
| One active session per user | “At most one `ACTIVE` session per account, across tabs and devices,” with a partial unique index |
| Multi-tab synchronization | Every logged-in tab shows the same task, countdown, and outcome. A new tab joins through `GET /api/sessions/active`. Heartbeats continue across OnYou navigation |
| Heartbeats every 10 seconds | `HEARTBEAT_INTERVAL_MS` (10 seconds), including the first heartbeat on start and a heartbeat on join |
| 30-second presence deadline | `PRESENCE_GRACE_SECONDS` (30). A heartbeat before the deadline renews it. A deadline at or before the scheduled end abandons the session; later heartbeats cannot revive it |
| Completion rule | Completed only when the session was not abandoned and the presence deadline is **strictly later** than the scheduled end |
| No legacy completion token | See §5. The names appear only as things not to build |
| Exactly-once rewards | One transaction and `WHERE status = 'ACTIVE'`. The server computes rewards |
| Feeding day | The session `endTime` in the user’s saved IANA timezone, including when resolution is late |
| Secrets | Environment variables only. `.env.example` has names. Do not log or commit secrets, passwords, reset tokens, or full JWTs |
| Passwords | `bcrypt`, cost ≥ 10 |
| JWT | HttpOnly, Secure, SameSite=Lax, unreadable by client JavaScript. Per-user `tokenVersion`; password reset increments it |
| Reset tokens | `crypto.randomBytes`, stored hashed, constant-time compare, single-use, 30 minutes. A new request invalidates older tokens. No hashed token for focus-session completion |
| Reset responses | Same response for an unknown email. Rate limits per email and per IP, counters in PostgreSQL |
| Ownership | Every endpoint authenticates and checks ownership. Heartbeat, complete, and abandon require the owner and do not use a tab token |
| Responses | Do not return password hashes, reset-token hashes, or internal errors |
| Accessibility | Semantic controls and landmarks, one `h1`, visible labels, `aria-describedby`, `aria-live="polite"`, keyboard focus, modal trap and Escape, phone bottom sheets, 4.5:1 contrast, text label with pet color, countdown announced at start, each minute, and completion, `prefers-reduced-motion`, alt text such as “Mochi is hungry” |

Also still stated: give up before the scheduled end abandons; give up after the end completes only when presence was met; completion before the end is rejected; logout during an Active session confirms, then abandons on every device; the server has no running timer; the shared resolution routine checks the scheduled end before a later expiry and resolves expiry before renewing a heartbeat.

## 5. Issue #11 refinements

From `HW3_Rules_Refinement_Report.md`. These were measured as process and naming differences, not as a hidden-test gain. Version 5 keeps them.

| Refinement | Version 5 |
| --- | --- |
| Internal tokens vs user-facing labels | §4 table: `STARVING` / `HUNGRY` / `FULL` and `ACTIVE` / `COMPLETED` / `ABANDONED` in code, Prisma, and JSON. Screens use Starving, Hungry, Full, Active, Completed, and Abandoned. §0 says this pair is not a PRD-versus-rules conflict. Alt text stays the mockup sentence, including “Mochi is hungry” |
| Red–green–refactor evidence | §6. A run that passes with no earlier failing run of those tests has not completed red. Writing tests and implementation before any run does not count as red. Refactor is recorded; an unrelated edit is not added just to create a refactor commit. The PR records the command, the counts, and the refactor note. Commit types stay `test`, then `feat`, then `refactor` when that pass edits code. Propose tests and wait for approval; approval does not replace the failing run |
| No no-op unused parameters | §5 and §11. Do not silence a parameter with `void param`, an empty assignment, or a dummy read. Keep a required `now` and comment why the feeding day is `endTime` (US6) |

## 6. PRD v2.9 and mockup references

Live `AGENTS.md` cites `OnYou_PRD_v2_9.md` in the header, §0, §2, §6, §7, and §8, and cites `OnYou_web_mockups.html` in the header, §0, and §7. Older PRD files are named only as historical.

Checked against the documents:

- PRD §5 matches §8: account-owned session, one Active session, 10-second heartbeats, 30-second deadline, strictly-later completion rule, shared resolution order, no unload events.
- PRD §6 matches §8: coins, 50-minute cap, apples at 25 minutes with a cap of 2, feeding day of `endTime`, coins never reset.
- PRD §7 matches the input-limit table: email 254, password 8–15, task 80 with blank `"Focus session"`, pet name 30 with blank **Mochi**.
- PRD §9 and the mockup match the layout constraints kept in §7: Home / History / Settings, active session bar, 1040px and 390px, breakpoint below 600px, phone bottom sheets, pine / plum / apple red as Tailwind tokens, in-code pet SVG.
- Mockup art states cited: Starving, Hungry, Full, waiting, slapped. Mockup alt text cited: “Mochi is hungry”.

**Caption to flag, not a rules change.** `OnYou_web_mockups.html` opens with “Copy and behavior follow PRD v2.8”. That sentence describes the v2.9 session model (account-owned, every tab, 30 seconds with no tab connected). The mockup file contains no `sessionStorage`, `X-Session-Token`, or `SessionElsewhereNotice`. Version 5 already says that if the mockup and the PRD disagree, follow the PRD and flag it. This report is that flag. The mockup file was not edited.

## 7. sessionStorage completion tokens

Every mention in version 5 is a prohibition or a historical change-log entry. None instruct an agent to store, require, or check a completion token.

| Line | Role |
| --- | --- |
| 30 | Obsolete model: do not implement `onyou.sessionToken`, `X-Session-Token`, hashed focus-session tokens, or `SessionElsewhereNotice` |
| 133 | Do not write tests that require a focus-session token in `sessionStorage` |
| 142 | Do not add `SessionElsewhereNotice` or UI that blocks completion for lack of a token |
| 158 | Never use those tokens, `beforeunload`, `pagehide`, `localStorage`, cookies, or WebSockets to decide outcomes |
| 182 | Do not document or implement `X-Session-Token` |
| 208 | Do’s and Don’ts: do not use those mechanisms for presence |
| 245 | Change log for version 3: ban on the token model |

Presence remains HTTP heartbeats.

## 8. Files left unchanged

SHA-256 after the edit matches the hash taken before it.

| File | SHA-256 | Result |
| --- | --- | --- |
| `docs/archive/rules/AGENTS_v3_before_simplification.md` | `123d61c4b62150005f5d0044916c7e77524cb2e23253f33fa460cf26a3609c89` | Unchanged |
| `docs/archive/rules/AGENTS_HW3_experiment_baseline.md` | `842d2c98759f050d307aad5cb270064862fa9398335c05e35bfef35cfa465965` | Unchanged |
| `docs/archive/rules/AGENTS_pre_v2_9.md` | `9966b0492ea193916c198ce6fc41749f2bfa12f01b20f1a60465219c6ac077ed` | Unchanged |
| `HW3_AGENTS_BASELINE.md` | `842d2c98759f050d307aad5cb270064862fa9398335c05e35bfef35cfa465965` | Unchanged; same bytes as the archived experiment baseline |
| `HW3_AGENTS_pre_v2_9.md` | `9966b0492ea193916c198ce6fc41749f2bfa12f01b20f1a60465219c6ac077ed` | Unchanged |
| `hw3-experiment/hidden-eval/rewards.hidden.test.ts` | `53d7c87d58f6d11d4b1a71e0d9d9270d9a6649a593d3371dfd7ab270df619653` | Unchanged |
| `hw3-experiment/hidden-eval/rewards.contract.ts` | `791ad2fd884157f71bd526410141e94116df34f2b3191e427e665eb9a9ee0884` | Unchanged |
| `hw3-experiment/ISSUE_11.md` | `ba880b3565bce22a65ffe32db5772baf7de1c3dda33a692ed3d1ce0a6a04a17e` | Unchanged |

This session wrote only `AGENTS.md` and this report. It did not open the BEFORE or AFTER implementation directories for writing, and it made no GitHub API calls, so issues, milestones, and the project board were not changed. Nothing was committed or pushed.
