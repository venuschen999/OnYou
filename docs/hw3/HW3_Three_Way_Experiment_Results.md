# HW3 Three-Way Experiment Results — Issue #11 Reward Calculation

**Evaluator:** independent measurement of the simplified-rules run, compared with the recorded No Rules and Original Rules measurements  
**Date:** 2026-10-28  
**Feature:** GitHub Issue #11 — pure reward calculation  
**Hidden suite:** `hw3-experiment/hidden-eval/rewards.hidden.test.ts` (14 tests), same file used on 2026-10-27

This report separates **observed results** from **interpretation**. The functional measurements do not show a winner. They also do not show that the shorter rules file improved reward correctness.

## Result

All three implementations pass the same 14 hidden tests, with 0 failures. `npm run typecheck` reports 0 errors for all three. On the Issue #11 checks F1–F7, A1–A4, V1, V2, and I1, all three pass.

The simplified-rules workspace, measured in this evaluation:

| Check | Result |
| --- | --- |
| Hidden tests | **14 passed, 0 failed.** Vitest 3.2.4, 2026-10-28 23:25:07 PDT, duration 266 ms, exit 0 |
| Typecheck | **exit 0, no diagnostics.** TypeScript 5.9.3, `tsc --noEmit` |
| Own unit tests | **19 passed, 0 failed.** 3 files: `rewards.test.ts` 14, `feedingDay.test.ts` 2, `feedingState.test.ts` 3 |
| v8 coverage of `src/lib/domain/` | **100%** lines (179/179), branches (29/29), functions (15/15) |

No Rules and Original Rules, measured on 2026-10-27 and recorded in `HW3_Before_After_Results.md`, were each 14/14 hidden, 0 typecheck errors, and 16/16 own tests. Those two source trees still have domain-file modification times from 2026-10-27 21:00–21:17. This evaluation did not re-run them and did not edit them.

## What was compared

| Condition | Workspace | Rules file in that workspace |
| --- | --- | --- |
| No Rules | `OnYou-experiment-before` | Absent |
| Original Rules | `OnYou-experiment-after` | Byte-identical to `HW3_AGENTS_BASELINE.md` (477 lines, SHA-256 `842d2c98759f050d307aad5cb270064862fa9398335c05e35bfef35cfa465965`) |
| Simplified Rules v5 | `OnYou-experiment-simplified` | Byte-identical to the live `AGENTS.md` (247 lines, SHA-256 `784e1146184799b9e14b0b129b6fe01d55a178e69a7b6b365ec8b246a3de9bef`) |

The original-rules file is the frozen experiment baseline, not the 502-line version 4 archive. Line counts are `wc -l`.

---

## Method

1. Left the generated simplified tree in place. Did not change domain code, the agent’s unit tests, hidden-test expectations, `AGENTS.md`, `HW3_AGENTS_BASELINE.md`, either earlier implementation, GitHub Issues, milestones, or the project board. Did not commit or push.
2. Checked that the simplified sources still match the generation session, and that the hidden suite is still the same 14 tests (details below).
3. The exported API differs from both earlier modules, so added `hw3-experiment/eval-run/simplified/rewards.adapter.ts` outside the implementation directory. The adapter renames functions, stamps the session feeding day onto the prior snapshot, and derives `coinsDelta` and `feedingMinutesCredited` from the totals. It does not reimplement the reward formulas.
4. Copied `rewards.hidden.test.ts` and `rewards.contract.ts` with `cp`. `cmp` against `hw3-experiment/hidden-eval/` succeeded before and after the run. `cmp` against the before and after eval copies also succeeded. SHA-256 of the hidden test is `53d7c87d58f6d11d4b1a71e0d9d9270d9a6649a593d3371dfd7ab270df619653`, the same value recorded when version 5 was written.
5. Ran, in the simplified workspace:
   - `npm run typecheck`
   - `npm test`
   - `npx vitest run --coverage` with text and json-summary reporters, report directory `hw3-experiment/eval-run/logs/coverage-simplified/`
6. Ran the hidden file from `hw3-experiment/eval-run/simplified/` with that directory’s Vitest 3.2.4. Its `node_modules` is a symlink to the simplified workspace’s installed dependencies.
7. Scored F1–F7, A1–A4, V1, V2, and I1 with those runs plus the generated source.
8. Compared the scores with the 2026-10-27 results. Did not treat Simplified Rules as the expected winner.

Runtime for this run: Node `v24.14.0`. The product spec names Node 22. The 2026-10-27 runs used this same Node version. The runtime does not explain differences among the three.

Logs:

| Run | Log |
| --- | --- |
| Simplified typecheck, own tests, coverage | `hw3-experiment/eval-run/logs/simplified-workspace.txt` |
| Simplified hidden tests | `hw3-experiment/eval-run/logs/simplified-hidden.txt` |
| Coverage JSON | `hw3-experiment/eval-run/logs/coverage-simplified/coverage-summary.json` |
| Source hashes before and after measurement | `hw3-experiment/eval-run/logs/source-sha256-simplified-before.txt` and `source-sha256-simplified-after.txt` |
| No Rules and Original Rules | the logs named in `HW3_Before_After_Results.md` |

Generation transcript: `d94acd6f-6e08-4a9d-aa68-d06e5481ca77` (one user message, 2026-10-28 10:36 PM UTC-7). It is the only transcript in the simplified project folder.

---

## Integrity checks

### The simplified implementation matches the generation session

Replayed every `Write` and `StrReplace` in that transcript. These files match the replay byte for byte:

- `src/lib/domain/constants.ts`
- `src/lib/domain/sessionStatus.ts`
- `src/lib/domain/feedingState.ts`
- `src/lib/domain/feedingDay.ts`
- `src/lib/domain/rewards.ts`
- `tests/unit/rewards.test.ts`
- `tests/unit/feedingDay.test.ts`
- `tests/unit/feedingState.test.ts`
- `tests/factories/rewardSession.ts`
- `vitest.config.ts`

SHA-256 of all 16 files outside `node_modules` and `coverage` matched before and after typecheck, `npm test`, coverage, and the hidden run. Domain source modification times stay on 2026-10-28 22:42–22:45. The transcript file’s modification time is 22:46:32. Measurement commands started at 23:24. The generation `coverage/` directory is still timestamped 22:46:27. The hidden test file is not in the simplified workspace. The adapter is not in the simplified workspace.

### The hidden suite is the previous 14 tests

`rewards.hidden.test.ts` contains 14 `it` blocks. The hidden-eval file, the No Rules eval copy, the Original Rules eval copy, and the copy used tonight are byte-identical. `rewards.contract.ts` is byte-identical across those same locations. Expectations were not edited.

### Shared inputs that match

| Variable | No Rules | Original Rules | Simplified Rules v5 |
| --- | --- | --- | --- |
| `ISSUE_11.md` | SHA-256 `ba880b3565bce22a…` | same | same |
| `OnYou_PRD_v2_9.md` | SHA-256 `1edeaefbf7f62083…` | same | same |
| `package.json` and `package-lock.json` | TypeScript 5.9.3, Vitest 3.2.4, `@vitest/coverage-v8` 3.2.4 | same | same |
| `tsconfig.json` (`strict: true`) | SHA-256 `0b9f9074eb43b7b2…` | same | same |
| Fenced implementation prompt | 1,774 characters, SHA-256 `3e693de2194f312588469b2d51d231f975189fdcae3053f2172b00121de0382c` | same | same, and equal to plan §5 |

### Setup differences that are real

These are observed. They are not hidden-test failures.

| Item | No Rules and Original Rules | Simplified Rules v5 |
| --- | --- | --- |
| Git repository | Empty repo present; no commits | No `.git` directory |
| `README.md` | Present | Absent |
| `src/lib/domain/.gitkeep` | Still present | Absent |
| `vitest.config.ts` | Seed file, 178 bytes, include `src/**/*.test.ts` and `tests/**/*.test.ts` | Replaced during generation with coverage thresholds of 95%. 301 bytes. Default Vitest include still ran the three test files |
| `.cursor/` and `.cursorrules` | Absent | Absent |
| Hidden tests during generation | Absent | Absent |

The fenced prompt is identical. The simplified user message, like the original-rules message, begins with “Use a **new Agent conversation**”. The no-rules message is the one that dropped the leading `U`, as already recorded.

---

## Observed functional results

### Hidden tests

| # | Test | No Rules | Original Rules | Simplified Rules v5 |
| --- | --- | --- | --- | --- |
| 1 | complete 15 from zero → 15 / 15 / 0 / STARVING | pass | pass | pass |
| 2 | second complete 15 → 30 / 30 / 1 / HUNGRY | pass | pass | pass |
| 3 | give up 25 after that sequence → unchanged | pass | pass | pass |
| 4 | complete 25 → 55 / 50 / 2 / FULL, 20 minutes credited | pass | pass | pass |
| 5 | complete 25 from zero → 25 / 25 / 1 | pass | pass | pass |
| 6 | complete 50 from zero → 50 / 50 / 2 | pass | pass | pass |
| 7 | complete 15 at 50 minutes → coins 65, minutes stay 50, credit 0 | pass | pass | pass |
| 8 | complete 50 at 40 minutes → minutes 50, credit 10, coins 90 | pass | pass | pass |
| 9 | abandoned 15 from zero stays zero | pass | pass | pass |
| 10 | abandoned 50 does not remove 15 / 15 / 0 | pass | pass | pass |
| 11 | `endTime` 2026-10-28T06:30:00.000Z in `America/Los_Angeles` is feeding day 2026-10-27 when `now` is 2026-10-29 | pass | pass | pass |
| 12 | `endTime` 2026-10-28T07:30:00.000Z is feeding day 2026-10-28 | pass | pass | pass |
| 13 | 0 / 1 / 2 apples map to STARVING / HUNGRY / FULL | pass | pass | pass |
| 14 | two calls, same snapshot, equal results; contract prior unchanged | pass | pass | pass |

No hidden test was skipped.

The simplified adapter calls `calculateRewards(state, session, now, timeZone)`, `feedingDay`, and `feedingStateForApples`. `feedingStateForApples` already returns `STARVING`, `HUNGRY`, and `FULL`, so this adapter does not translate those literals. It does stamp `feedingDay` onto the prior object, because `PetRewardState` requires that field and the function uses it. The stamp is the session’s end day. That is the same same-day-snapshot rule the plan allows and the same stamp the No Rules adapter used. Deltas are `next.coins - prior.coins` and `next.feedingMinutes - prior.feedingMinutes`.

### TypeScript and own tests

| Command | No Rules (2026-10-27) | Original Rules (2026-10-27) | Simplified Rules v5 (2026-10-28) |
| --- | --- | --- | --- |
| `npm run typecheck` | exit 0 | exit 0 | exit 0 |
| `npm test` | 2 files, 16 passed | 2 files, 16 passed | 3 files, 19 passed |
| Domain v8 lines | 86.86% of all instrumented files (119/137); 100% of executable modules (119/119) | 100% (100/100) | 100% (179/179) |
| Domain v8 branches, executable | 100% (28/28) | 100% (20/20) | 100% (29/29) |

There is no `lint` script in the shared `package.json`. Lint was not run.

The 19 passing tests are the agent’s own tests. The common functional measure is the 14 hidden tests, which tie.

### Acceptance and architecture rubric

The rubric is the one in `HW3_Before_After_Experiment_Plan.md` §6. Simplified evidence is from this run. The other two columns are the 2026-10-27 scores.

| ID | No Rules | Original Rules | Simplified Rules v5 |
| --- | --- | --- | --- |
| F1 Domain code under `src/lib/domain/` | Pass | Pass | Pass. Five modules: `constants.ts`, `sessionStatus.ts`, `feedingState.ts`, `feedingDay.ts`, `rewards.ts` |
| F2 `now` and timezone are parameters; no `Date.now()` or Prisma | Pass | Pass | Pass. `rg` under `src/` found no `Date.now`, no `new Date(`, and no Prisma. `calculateRewards` takes `now` and does not read it. `applyDailyReset` and `emptyRewardState` do read `now` |
| F3 Completed coins = duration; abandoned adds none | Pass | Pass | Pass. Hidden cases, and `coinsEarnedForSession` returns `durationMinutes` only for `COMPLETED` |
| F4 Add duration, then cap at 50; overflow discarded | Pass | Pass | Pass. Hidden cap cases. `applyFeedingMinuteCap` uses `MAX_FEEDING_MINUTES_PER_DAY` |
| F5 Apples = min(2, floor(minutes / 25)); leftover carries | Pass | Pass | Pass. `applesForFeedingMinutes` and `leftoverFeedingMinutes` use `APPLE_MINUTES` and `MAX_APPLES_PER_DAY` |
| F6 Canonical §6 sequence | Pass | Pass | Pass. Hidden sequence and `tests/unit/rewards.test.ts` |
| F7 Feeding day from `endTime`, not `now` | Pass | Pass | Pass. Hidden late-resolution and post-midnight cases. `calculateRewards` calls `feedingDay(session.endTime, timeZone)` |
| A1 No I/O in domain | Pass | Pass | Pass. Pure functions and `Intl.DateTimeFormat` |
| A2 Named constants for 25, 50, and 2 | Pass | Pass | Pass. Those values appear as `APPLE_MINUTES`, `MAX_FEEDING_MINUTES_PER_DAY`, and `MAX_APPLES_PER_DAY`. The other `2` under `src/` is the Intl `"2-digit"` option |
| A3 No HTTP, Prisma, or UI | Pass | Pass | Pass |
| A4 No session-token implementation | Pass | Pass | Pass. No `sessionStorage`, `X-Session-Token`, or `SessionElsewhereNotice` under `src/` or `tests/` |
| V1 Abandoned is not partial credit | Pass | Pass | Pass |
| V2 Feeding-minute reduction is only the 50 cap | Pass | Pass | Pass on the hidden cases. See the unscored later-day path below |
| I1 No invented coin or apple rate | Pass | Pass | Pass. A completed session’s coins are `durationMinutes` for any length the function receives. There is no second rate and no throw for a duration other than 15, 25, or 50 |

Prompt-only score, ignoring A2: pass for all three.

---

## Observed organization, naming, and workflow

### Code organization

| Piece | No Rules | Original Rules | Simplified Rules v5 |
| --- | --- | --- | --- |
| Modules | `constants.ts`, `types.ts`, `feedingDay.ts`, `rewards.ts`, `index.ts` | `feedingDay.ts`, `rewards.ts` | `constants.ts`, `sessionStatus.ts`, `feedingState.ts`, `feedingDay.ts`, `rewards.ts` |
| Tests | Colocated: `src/lib/domain/rewards.test.ts` (13), `feedingDay.test.ts` (3) | `tests/unit/rewards.test.ts` (11), `feedingDay.test.ts` (5) | `tests/unit/rewards.test.ts` (14), `feedingDay.test.ts` (2), `feedingState.test.ts` (3), plus `tests/factories/rewardSession.ts` |
| Status literals | `"Completed"` \| `"Abandoned"` | `"COMPLETED"` \| `"ABANDONED"` | `SessionStatus.COMPLETED`, `ABANDONED`, and `ACTIVE`, values `"COMPLETED"`, `"ABANDONED"`, `"ACTIVE"` |
| State literals | `"Starving"` \| `"Hungry"` \| `"Full"` | `"STARVING"` \| `"HUNGRY"` \| `"FULL"` | Tokens `STARVING` / `HUNGRY` / `FULL`, and `feedingStateLabel` returns `Starving` / `Hungry` / `Full` |
| Main entry | `applySessionRewards` | `calculateRewards(input)` | `calculateRewards(state, session, now, timeZone)` |
| Daily reset | Inside apply when the stored day differs, and `rewardStateAsOf` | `progressForFeedingDay` only. Apply always adds the minutes it is given | `applyDailyReset` for a view of `now`. Apply adds minutes when the stored day is the session day or earlier, and adds coins only when the stored day is already later |
| `now` on apply | Parameter present, silenced with `void now` | Field on `RewardInput`, not read inside `calculateRewards`, no `void` | Parameter present, not read, no `void`. Comment: `// US6: callers pass the clock. Feeding credit uses the session endTime, not now.` |
| Cap constant | `DAILY_FEEDING_MINUTES_CAP = 50` | `MAX_FEEDING_MINUTES_PER_DAY = APPLE_MINUTES * MAX_APPLES_PER_DAY` | `MAX_FEEDING_MINUTES_PER_DAY = 50` |

`feedingStateForApples` returns `FULL` when `apples >= MAX_APPLES_PER_DAY`, `HUNGRY` when `apples > 0`, and `STARVING` otherwise. The hidden mapping test calls 0, 1, and 2 only. Those three calls return `STARVING`, `HUNGRY`, and `FULL`.

### Behavior the hidden suite does not score

All three credit a completed session onto the feeding day of `endTime`, cap feeding minutes at 50, leave coins uncapped, and leave an abandoned session’s totals unchanged. The adapters force the prior snapshot onto the session’s end day. A prior from a different feeding day was not in the hidden file.

Source inspection of the simplified `creditSession` shows an extra branch the hidden calls do not hit: if `state.feedingDay` is already later than the session day, coins increase by the duration and feeding minutes stay on that later day. If the stored day is earlier, prior minutes are treated as zero and the new minutes land on the session day. The No Rules apply path treats any mismatched day as a zero minute base and then writes the session day. The Original Rules apply path always adds the minutes it is given. The plan accepts a current-day prior. This difference is not a hidden-test failure.

The simplified unit tests do cover that later-day branch, the same-day reset, a source scan for `Date.now` / `new Date()` / Prisma, and both the token and the label. Those tests are the agent’s tests. They are not part of the 14.

### Red–green–refactor, as the transcript shows it

Tool order in `d94acd6f-6e08-4a9d-aa68-d06e5481ca77`:

1. Read the issue and the PRD. The transcript text contains no `AGENTS.md` and no `Read` of that file.
2. Wrote `tests/factories/rewardSession.ts`, `tests/unit/feedingState.test.ts`, `tests/unit/feedingDay.test.ts`, and `tests/unit/rewards.test.ts` before any file under `src/lib/domain/` existed.
3. Ran `npm test` with the description “Run unit tests expecting red failure”.
4. Edited `rewards.test.ts`: changed the late-resolution expectation, and added the same-day reset test.
5. Wrote the domain modules and replaced `vitest.config.ts`.
6. Rewrote `feedingDay` twice, moving the US6 comment onto the `now` parameter.
7. Ran `npm test && npm run typecheck && npm run test:coverage`.
8. Edited `rewards.ts` so coin amounts go through `coinsEarnedForSession`, and added the daily-reset comment.
9. Ran `npm test && npm run typecheck`, then `npm run test:coverage`.
10. Closing note states: red was 3 suites unable to load; green was 19 passed, typecheck passed, coverage 100%; refactor re-ran 19 passed and typecheck. The note also says the workspace has no lint script.

The jsonl stores tool calls, not tool output. The “3 suites unable to load” sentence is the agent’s summary. This evaluation did not recover the raw red log. The re-run above is of the final tree only: 19 passed, typecheck exit 0, coverage 100%.

The late-resolution edit is visible in the transcript. The first draft expected feeding day `2026-10-28`, 0 feeding minutes, and `STARVING`. The edited test expects feeding day `2026-10-27`, 50 minutes, and `FULL`. That edit, and the new same-day reset test, happened after the red command and before the domain files existed. The failing command therefore did not execute the final 19 tests.

There is one user message. The agent did not stop for test approval. The transcript contains no `git commit`. The workspace has no git repository, so a commit could not have been recorded there anyway.

Comparison with the earlier transcripts, from `HW3_Before_After_Results.md` and a check of those files tonight:

| Workflow fact | No Rules | Original Rules | Simplified Rules v5 |
| --- | --- | --- | --- |
| Rules file read, logged as a `Read` tool call | No file to read. The agent globbed for `AGENTS.md` | Yes, `AGENTS.md`, before tests | No logged `Read`. The file was on disk |
| Tests written before implementation | No. Implementation files were written first. First `npm test` passed | Yes. `npm test` ran while the modules were missing | Yes. `npm test` ran while the modules were missing |
| Final tests are the tests that failed | No failing run recorded | The previous report records a failure on missing modules, then implementation. It does not record a post-red assertion edit | No. Two edits landed after the red command |
| Wait for approval | No | No | No |
| `test` / `feat` / `refactor` commits | No | No | No |
| Post-green edit labeled as refactor, then tests re-run | Not recorded | Not recorded. Closing note says typecheck, 16 tests, 100% coverage, and “I did not commit.” Model self-report: Cursor Grok 4.6 | Yes, in the closing note. The edit is in the transcript. Model name is not in the transcript |
| `void now` | Present in `applySessionRewards` | Absent | Absent |

---

## Interpretation

These sentences go beyond the measurements. They are not additional test results.

**Functional correctness.** The hidden suite, the compiler, and F1–F7 tie. A shorter rules file cannot be credited with a correctness gain that was not observed. The move from 16 own tests to 19 own tests is a different test set: three feeding-state tests in their own file, a same-day reset test, a later-day guard, a source-text scan, and label assertions, with only two feeding-day tests against the original-rules run’s five. The shared bar remains 14/14.

**Architecture rubric from the original plan.** All three pass A1–A4. Passing A2 on the no-rules run was already true on 2026-10-27, and the prompt already required pure functions under `src/lib/domain/`. Simplified Rules v5 did not create that pass.

**Naming.** Uppercase status and state tokens, `tests/unit/`, `calculateRewards`, `APPLE_MINUTES`, `MAX_APPLES_PER_DAY`, and a `// US6:` comment are present in both rules runs and absent, or spelled differently, in the no-rules run. Those overlaps appeared when the longer baseline was the rules file. They are not evidence that shortening caused them.

Version 5 states an explicit token/label pair and says a required `now` must stay, with a comment, and must not be silenced with `void`. The simplified code has `feedingStateLabel` plus the tokens, and it does not use `void now`. The no-rules code uses `void now` and uses the title-case words as the state values. The original-rules code uses the tokens, does not define a label function, and does not use `void`. The token-plus-label split matches a version 5 rule that the baseline stated in a mixed way. That is a content difference between the two rules files, not a measurement that fewer lines produced better rewards.

**Workflow.** Both rules runs issued `npm test` before the domain modules existed. The simplified run then changed an expectation and added a test before implementation, so the red command was not a failing run of the final suite. Version 5 says a green run with no earlier failing run of those tests has not completed red, and it says to propose tests and wait. The transcript shows neither the wait nor a failing run of the final file. Calling the simplified session a completed red–green–refactor cycle would overstate the log. A post-green edit did happen, and the closing note calls it a refactor. No commit exists for it.

**Causation.** This comparison does not support “shorter rules improved Issue #11.” The functional scores tie. The naming and directory patterns that distinguish the rules runs from the no-rules run were already observed with the longer baseline. The version 5-only patterns are confounded with rewritten rules, an unrecorded model name, a workspace with no git repository, and a vitest config the agent replaced. Length and content changed together.

---

## Limitations and unresolved evaluation problems

- **Model identity for the simplified run is unresolved.** The transcript has no model field and the closing note does not name one. The original-rules closing note says “Cursor Grok 4.6”. The no-rules report recorded the same self-report. This evaluation cannot show that the three runs used one model.
- **The red log is unresolved.** The jsonl does not contain the Vitest output of the pre-implementation `npm test`. Only the agent’s later sentence, “3 suites unable to load,” is available. The final 19 passing tests were re-run here. The intermediate green run, before the refactor edit, was not re-run.
- **The red command and the final tests differ.** The late-resolution expectation was changed, and one test was added, after that command and before implementation. Version 5’s definition of a completed red step is not met by the final file.
- **The simplified workspace was not an exact copy of the earlier seed.** No git repository, no `README.md`, and no `.gitkeep`. `vitest.config.ts` was rewritten during generation. Package files, TypeScript config, the PRD, and the issue file do match. Missing git means the commit half of the workflow could not show up in `git log` even if a commit had been attempted. The transcript shows no attempt.
- **No logged read of `AGENTS.md` in the simplified transcript.** The file was present and matches live version 5. Cursor’s own header says it loads `AGENTS.md` from the project root. The generation jsonl does not include the system prompt, so this evaluation cannot see whether that load happened. Influence is inferred from the output, not from a logged read. The original-rules transcript does contain a `Read` of `AGENTS.md`.
- **Adapters still sit between the hidden tests and the code.** They translate names and compute deltas. The simplified adapter also fills in `feedingDay`. Cross-day priors were not scored. The later-day branch described above is real in the source and unmeasured by the 14 tests.
- **No Rules and Original Rules were not re-executed tonight.** Their 14/14, 16/16, and coverage figures are the 2026-10-27 measurements. Domain file times are still from that generation. A fresh re-run could in principle differ if the machine changed; it was not performed.
- **Node v24.14.0 ran the tests.** The spec says Node 22. All three conditions were measured on v24. Results on Node 22 were not measured.
- **User-level Cursor rules could have applied to every window.** That residual risk is unchanged from the original plan. It is a reason to be careful about shared behavior.
- **No database, HTTP, or UI behavior was in scope.** Exactly-once reward transactions are a later issue. These results say nothing about them.
- **`AGENTS.md` and `HW3_AGENTS_BASELINE.md` were not edited by this evaluation.** Their SHA-256 values after the runs match the values recorded above. Live `AGENTS.md` and the simplified copy still match each other.
