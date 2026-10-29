# HW3 Rules Refinement Report — Issue #11

**Date:** 2026-10-27  
**Live rules updated:** `AGENTS.md` (version 4)  
**Evidence:** `HW3_Before_After_Results.md`, `HW3_Before_After_Experiment_Plan.md`, `HW3_AGENTS_BASELINE.md`, `OnYou_PRD_v2_9.md`, `OnYou_web_mockups.html`  
**Not modified:** `HW3_AGENTS_BASELINE.md`, both experiment implementations, hidden tests, GitHub Issues, milestones, and the Scrum board.

The Issue #11 experiment measured **no gain in functional correctness**. Both conditions passed 16/16 of their own unit tests, 14/14 hidden tests, 7/7 acceptance checks, and `tsc --noEmit` with zero errors. The refinements below respond to differences that were measured in naming, workflow, and one unused-parameter pattern. They have not been re-tested with a new generation run. Benefits listed as expected are predictions, not new measurements.

The Issue #11 runs did **not** complete full TDD. AFTER ran a failing `npm test` before adding domain modules, then made the tests pass. It did not wait for test approval, did not commit, and did not record a refactor pass. BEFORE wrote implementation and tests before the first run, and that run passed. Neither repository has a commit.

---

## 1. Internal enum tokens and user-facing labels

### Original rule

Baseline §4: enums are `PascalCase` names with `UPPER_CASE` values (`SessionStatus.ACTIVE`).

Baseline §8: `0 → STARVING`, `1 → HUNGRY`, `2 → FULL`.

The same file’s §6 reference example, the PRD §6 table, and `OnYou_web_mockups.html` use the visible words Starving, Hungry, and Full. History badges in the mockup are Completed and Abandoned. The PRD names session status Active, Completed, and Abandoned.

Section 0 said that if the PRD and this file disagree, stop and ask. It did not say that a token and a label can both be correct.

### Observed experiment result

Measured, and not a correctness gain. Hidden tests and typecheck tied at 14/14 and 0 errors.

AFTER, which had the baseline, emitted `STARVING` / `HUNGRY` / `FULL` and `COMPLETED` / `ABANDONED`. BEFORE, which had the PRD and the same prompt, emitted `Starving` / `Hungry` / `Full` and `Completed` / `Abandoned`. The shared prompt said “Starving, Hungry, Full.” The adapter uppercased BEFORE’s labels so the hidden contract could compare behavior. Coins, feeding minutes, apples, the 50-minute cap, and the feeding day of `endTime` matched.

So the uppercase rule changed spelling. It did not change reward results. The file was also inconsistent: §8 used tokens, and the reference example used PRD words.

### Updated rule

`AGENTS.md` §4 now separates the two layers.

- Code, Prisma, and JSON keep `UPPER_CASE` tokens.
- Screens use the PRD and mockup strings exactly: Starving, Hungry, Full, Active, Completed, Abandoned. Alt text stays the mockup sentence, including “Mochi is hungry”.
- Meaning is unchanged: 0 / 1 / 2 apples are still `STARVING` / `HUNGRY` / `FULL`. `ACTIVE` is still the one account-owned in-progress session. `COMPLETED` and `ABANDONED` are still final, and only a completed session that met the presence rule earns rewards.
- Section 0 now says this pair is not a PRD-versus-rules conflict.
- §7.2 and §8 point at the same map. The §6 numeric example is unchanged. Tests assert tokens in domain code and PRD words in rendered copy.

### Reason

The measured split came from one rule being applied to two surfaces. Making both surfaces explicit keeps the coding convention that AFTER followed and the copy that BEFORE followed, without treating either result as a failed reward module.

### Expected benefit

Not measured again. A later agent should be able to store `STARVING` and render Starving without an adapter and without stopping to ask which spelling is “the” product word. Reward formulas are unchanged, so this rule is not expected to raise the hidden-test score by itself.

---

## 2. Red–green–refactor evidence

### Original rule

Baseline §6:

1. Red: write failing tests and commit them alone as `test: <behavior> (#<issue>)`.
2. Green: minimum code, commit `feat: <description> (#<issue>)`.
3. Refactor: improve with tests green, commit `refactor: <description> (#<issue>)`.

Also: propose tests and wait for approval before implementation. Never skip, loosen, or mock the module under test. Section 10: those commit types stay in history because squash-merge is not used.

### Observed experiment result

Measured process difference. It did not change the 14 hidden tests.

| Step the baseline describes | BEFORE | AFTER |
| --- | --- | --- |
| Failing test run before implementation | No. Implementation files were written first. The first `npm test` passed (16/16). | Yes. `npm test` failed because the modules were missing. Then the modules were added. |
| Passing test run after implementation | Yes. 16/16, reproduced in evaluation. | Yes. 16/16, reproduced in evaluation. |
| Refactor pass, recorded | No separate refactor step in the transcript. | No separate refactor step. A circular import was fixed while making the code compile; that was not recorded as refactor. |
| `test` / `feat` / `refactor` commits | No commits. `main` has no commits. | No commits. `main` has no commits. |
| Wait for test approval | The only user message was the implementation prompt. | Same. The agent continued in one turn. |

Full TDD, as the baseline defined it, happened in neither workspace.

### Updated rule

Section 6 still uses the same commit types, in the same order, from Section 10:

- Red commit: `test: <behavior> (#<issue>)`, tests only, after a run that fails because the behavior is missing.
- Green commit: `feat: <description> (#<issue>)`, after the same tests pass.
- Refactor commit: `refactor: <description> (#<issue>)` only when that pass edits code.

What was added is evidence, not a new commit type:

- A first green run with no earlier failing run of those tests does not count as red. Writing tests and implementation before any run does not count as red.
- The refactor step is required as a record. If the code should not change, say so and re-run the tests. Do not invent an unrelated edit in order to have a refactor commit.
- The PR body includes the command, the failed or passed counts, and the refactor note for all three steps.
- Proposing tests and waiting for approval stays. Approval does not replace the failing run.

The definition of done now asks for that red–green–refactor evidence instead of only “tests written first and passing.”

### Reason

The old text named the commits and the three phases. The Issue #11 transcripts show that an agent can still finish with a green suite and skip the failing run (BEFORE) or skip the commits and the refactor record (AFTER). The functional tie means those skips were not punished by the hidden tests. The workflow rule has to require the runs and the write-up, or a green suite will keep standing in for the whole cycle.

Commit types were left as they are because the team workflow in Section 10 already specifies them, and this task was to stay consistent with that workflow. The experiment does not show that changing commit types would have improved rewards.

### Expected benefit

Not measured. The next implementation done under this file should leave a failing log, a passing log, and a refactor note, plus the existing `test` then `feat` commits when the team is committing. That is a process record. It is not evidence that reward calculations will score higher than the 14/14 already achieved without full TDD.

---

## 3. No-op unused parameters

### Original rule

Baseline §5 and §8 require domain functions to take `now` and a timezone, and forbid `Date.now()` inside `lib/domain/`. They do not say what to do when a required parameter must not affect a particular decision.

### Observed experiment result

Measured in the BEFORE source. `applySessionRewards` takes `now` and then contains `void now`. Feeding day is computed from `session.endTime`. Hidden test 11 still passed: `endTime` `2026-10-28T06:30:00.000Z` in `America/Los_Angeles` is feeding day `2026-10-27` when `now` is `2026-10-29`. So the no-op did not cause a wrong day.

AFTER accepted `now` on `RewardInput` and did not read `input.now` inside `calculateRewards`. It had no `void` expression. The same hidden test passed. Midnight reset in both designs uses `now` on a different function (`rewardStateAsOf`, `progressForFeedingDay`).

`void now` was a style artifact of an unused binding. It was not a functional fix, and it was not required for the tests.

### Updated rule

Section 5 and the Section 11 table now forbid silencing an unused parameter with `void param`, an empty assignment, or a dummy read.

If the signature requires the parameter, keep it and comment why it is unused. The example in the rule is the case the experiment actually hit: `now` remains so callers pass the clock, and this function still credits `endTime` (US6). The rule also forbids reading the parameter only so a warning disappears.

### Reason

The product rule and the unused-parameter warning pulled BEFORE into a no-op. The hidden tests show the correct behavior is to ignore `now` when choosing the feeding day, not to delete the parameter and not to invent a use for it. A comment states that. A `void` expression does not.

### Expected benefit

Not measured. Later domain functions should document an intentionally unused `now` instead of suppressing it. Feeding-day behavior should stay the behavior both implementations already passed. This rule is not expected to change coins, apples, or the cap.

---

## Rules left unchanged, and why

These were checked against the same results and were not rewritten.

| Rule | Experiment evidence | Decision |
| --- | --- | --- |
| Unit tests live in `tests/unit/` | AFTER did this; BEFORE colocated tests. Both scored 16/16 and 14/14. | Kept. The difference was organization, and the results report already treats it as consistency rather than correctness. |
| `// US6:` on non-obvious reward rules | Present only in AFTER. Same hidden outcomes. | Kept. It aided review and did not change formulas. |
| Named constants for 25, 50, and 2 | Both conditions passed A2. The prompt already stated the numbers. | Kept. The experiment does not show that the constant rule was unnecessary as a project convention, and it also does not show a functional gain. |
| Account-owned sessions, 10-second heartbeats, 30-second presence grace | Not exercised by Issue #11. Unchanged in §1, §5, and §8. | Kept. Out of scope for this feature, and not contradicted. |
| Security §12 (bcrypt cost ≥ 10, HttpOnly JWT, `tokenVersion`, hashed reset tokens, no secret logging) | Not exercised. Section text matches the baseline byte for byte. | Kept. |
| No `sessionStorage` completion token, no `X-Session-Token`, no `SessionElsewhereNotice` | Neither implementation added them. The prohibitions are still in §1, §6, §7, §8, §9, and §11. | Kept. No legacy token instructions were added. |
| PRD v2.9 and `OnYou_web_mockups.html` as sources of truth | Both runs used the PRD. The label bug was the rules file fighting the PRD’s words. | Kept, and the new label map points back at both files. |
| Domain coverage ≥ 95% lines and branches | BEFORE’s directory total was 86.86% lines only because type-only `types.ts` was counted. Executable files were 100% on both sides. | Not changed in this pass. The user asked for naming, TDD, and unused-parameter rules. Changing the coverage gate would be a new metric rule without a failed hidden test. |

---

## Final validation

Checked after the edit. `HW3_AGENTS_BASELINE.md` was not written in this pass. `cmp` of the baseline against live `AGENTS.md` differs, which is the live refinement. These slices of the live file match the baseline exactly:

| Slice | Result |
| --- | --- |
| `## 12. Security requirements` through the start of accessibility | Identical |
| `### Sessions (PRD v2.9 §5)` through the start of rewards | Identical, including account-owned `ACTIVE`, `HEARTBEAT_INTERVAL_MS`, and the ban on focus-session tokens |
| `## 13. Accessibility requirements` through the start of Section 14 | Identical |

Also still present in live `AGENTS.md`:

- `OnYou_PRD_v2_9.md` and `OnYou_web_mockups.html` in §0, §3, and §7.1
- “A focus session belongs to the **account**, not to a tab.”
- Heartbeats every 10 seconds from every authenticated tab; presence grace 30 seconds; HTTP heartbeat, not WebSockets
- Obsolete sessionStorage model named only as something **not** to implement
- `bcrypt` cost ≥ 10, JWT HttpOnly / Secure / SameSite=Lax, per-user `tokenVersion`

Version 4 is recorded in the file header and in the Section 14 change log.
