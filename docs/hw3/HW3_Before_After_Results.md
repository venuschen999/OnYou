# HW3 Before/After Results — Issue #11 Reward Calculation

**Evaluator:** independent measurement after both generation runs  
**Date:** 2026-10-27  
**Feature:** GitHub Issue #11 — pure reward calculation  
**Hypothesis under test:** H1 from `HW3_Before_After_Experiment_Plan.md` (frozen `AGENTS.md` produces a more correct and more architecturally consistent reward module). H0: the rules file does not improve the §6 metrics.

## Result

On the functional metrics, the two implementations tie. The same 14 hidden tests passed for both, with 0 failures. `npm run typecheck` reported 0 errors for both. Every Issue #11 acceptance check in the experiment plan (F1–F7) passed for both. H1 is not supported for reward correctness.

The runs differ in process and naming. Those differences line up with specific `AGENTS.md` rules for test location, enum spelling, a user-story comment, the example constant names, and an observed red test step. They do not change coins, feeding minutes, apples, the 50-minute cap, or the feeding day of `endTime`. One naming difference moves away from the shared prompt: the prompt says “Starving, Hungry, Full,” and BEFORE uses those labels, while AFTER uses `STARVING`, `HUNGRY`, and `FULL`.

Neither implementation was edited for this evaluation. SHA-256 hashes of the 30 non-git, non-`node_modules`, non-`coverage` files in each workspace matched before and after the measurement commands.

---

## Experiment methodology

1. Confirmed the generation conditions from the experiment plan, the two workspace trees, and the single Agent transcript in each experiment window.
2. Left both generated trees in place. Did not change domain code, the agents’ unit tests, hidden-test expectations, `AGENTS.md`, `HW3_AGENTS_BASELINE.md`, GitHub Issues, the project board, or milestones.
3. Because the public APIs differ, added adapters under `hw3-experiment/eval-run/`, outside both implementation directories. Each adapter renames functions and fields and derives `coinsDelta` and `feedingMinutesCredited` from the totals. It does not reimplement the reward formulas.
4. Copied `rewards.hidden.test.ts` and `rewards.contract.ts` byte-for-byte into each eval directory. `cmp` against `hw3-experiment/hidden-eval/` succeeded after the runs.
5. Ran, separately for each workspace:
   - `npm run typecheck` (`tsc --noEmit`, TypeScript 5.9.3)
   - `npm test` (`vitest run`, Vitest 3.2.4)
   - `npx vitest run --coverage` with v8, text and json-summary reporters, report directory outside the workspace
   - the hidden file through that workspace’s adapter
6. Scored F1–F7, A1–A4, V1–V2, and the “no invented rate” inspection from the plan by combining those runs with the source as generated.
7. Compared the scores without treating AFTER as the expected winner.

Runtime for every command was Node `v24.14.0`. The product spec names Node 22. Both conditions used this same binary, so the runtime does not explain differences between them.

Measurement logs:

| Run | Log |
| --- | --- |
| BEFORE typecheck, own tests, coverage | `hw3-experiment/eval-run/logs/before-workspace.txt` |
| BEFORE hidden tests | `hw3-experiment/eval-run/logs/before-hidden.txt` |
| AFTER typecheck, own tests, coverage | `hw3-experiment/eval-run/logs/after-workspace.txt` |
| AFTER hidden tests | `hw3-experiment/eval-run/logs/after-hidden.txt` |
| Coverage JSON | `hw3-experiment/eval-run/logs/coverage-before/coverage-summary.json` and `coverage-after/coverage-summary.json` |

Adapters: `hw3-experiment/eval-run/before/rewards.adapter.ts` and `hw3-experiment/eval-run/after/rewards.adapter.ts`. Each eval directory’s `node_modules` is a symlink to that condition’s installed dependencies. The hidden test was Vitest 3.2.4 started in the eval directory.

---

## Controlled variables

Checked for this evaluation, not only taken from the plan.

| Variable | BEFORE | AFTER | Same? |
| --- | --- | --- | --- |
| Feature | Issue #11 | Issue #11 | Yes. `ISSUE_11.md` files are byte-identical, and both match `hw3-experiment/ISSUE_11.md` |
| Product rules | `OnYou_PRD_v2_9.md` | same file bytes | Yes, and both match the main-repo PRD |
| Starting code | Empty domain plus `.gitkeep` at generation time | Same | Yes, per the plan. `.gitkeep` is still present |
| Dependencies | TypeScript 5.9.3, Vitest 3.2.4, `@vitest/coverage-v8` 3.2.4 | Same | Yes. `package.json` and `package-lock.json` are byte-identical |
| Tool config | `tsconfig.json` `strict: true`, shared Vitest include | Same | Yes, byte-identical |
| Implementation prompt inside the fence | Plan §5 | Plan §5 | Yes. Both transcripts’ fenced prompt equals §5 exactly (1,774 characters) |
| Model recorded by the agent | “Cursor Grok 4.6” | “Cursor Grok 4.6” | Same self-report. This evaluation could not read the model picker UI |
| Conversation | New chat `5f42f947-f5e2-43e7-86c4-14bddb927828` | New chat `36ddbd84-65d1-400e-8999-b241567f1802` | One user message each. No follow-up and no clarifying question |
| Start time recorded in the transcript | 2026-10-27 8:58 PM (UTC-7) | 2026-10-27 9:15 PM PDT | Different clock time, same evening |
| `AGENTS.md` | Absent. No `.cursor/` and no `.cursorrules` | Present, and `cmp` equal to `HW3_AGENTS_BASELINE.md` | **This is the intended independent variable** |
| Hidden tests during generation | Not in the workspace | Not in the workspace | Yes |
| Older PRDs and mockups | Absent | Absent | Yes |
| Git history | `main` has no commits; all files untracked | Same | Neither run created the TDD commits the baseline describes |
| Human edits after generation | No second transcript; source hashes stable | Same | Preserved |

Main-repo `AGENTS.md` still matches `HW3_AGENTS_BASELINE.md` (`cmp` succeeded). This evaluation did not edit either file.

### Prompt-delivery caveat

Both user messages also included the plan’s surrounding sentences (“Use a new Agent conversation…”, and “Record: chat URL…”). Those sentences are outside the fenced §5 prompt. The two full messages differ by one character: BEFORE begins `se a **new Agent conversation**` and AFTER begins `Use a **new Agent conversation**`. The fenced requirements are identical. Both agents implemented Issue #11 and wrote a model record, so both read past that first word. This one-character wrapper difference is real and is not a difference in the feature requirements.

---

## BEFORE results

Workspace: `/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-before`  
Transcript: `5f42f947-f5e2-43e7-86c4-14bddb927828`  
Model self-report: Cursor Grok 4.6  
Rules file: none.

### Hidden tests

**14 passed, 0 failed.** Vitest 3.2.4, 2026-10-27 21:41:24 PDT, duration 219 ms. Exit 0.

Every case in `rewards.hidden.test.ts` passed, including the §6 sequence, complete-25 and complete-50 from zero, the 50-minute cap (already-full + 15, and 40 + 50), abandoned-from-zero, abandoned-does-not-remove, `America/Los_Angeles` late resolution (`2026-10-28T06:30:00.000Z` → `2026-10-27` while `now` is 2026-10-29), post-midnight `endTime` → `2026-10-28`, state mapping, and same-snapshot purity.

The adapter mapped `Completed` / `Abandoned` to the contract’s `COMPLETED` / `ABANDONED`, and `Starving` / `Hungry` / `Full` to `STARVING` / `HUNGRY` / `FULL`. Deltas are `next.coins - prior.coins` and `next.feedingMinutes - prior.feedingMinutes`. The adapter stamps the session’s feeding day onto the prior snapshot so same-day minutes are eligible. That matches the plan’s rule that a prior snapshot may already be the current feeding day.

### TypeScript

`npm run typecheck` → `tsc --noEmit` → **exit 0, no diagnostics.**

During generation, the first `tsc` failed on `.ts` import extensions. The same session switched to extensionless imports. The scored tree is the final one, and it typechecks.

### Acceptance criteria (F1–F7)

| ID | Result | Evidence |
| --- | --- | --- |
| F1 | Pass | Domain code is under `src/lib/domain/` |
| F2 | Pass | `applySessionRewards(current, session, now, timeZone)` and `feedingDayOf(instant, timeZone)` take the clock and zone as arguments. `rg` found no `Date.now`, no `new Date(`, and no Prisma under `src/` |
| F3 | Pass | Hidden completed and abandoned cases. `coinsFromSession` returns `durationMinutes` only when status is `Completed`, else 0 |
| F4 | Pass | Hidden cap cases. `applyDailyFeedingCap` uses `Math.min(DAILY_FEEDING_MINUTES_CAP, total)` and reports the discarded remainder |
| F5 | Pass | `min(2, floor(minutes / 25))` via named constants. Canonical sequence reaches 1 apple at 30 minutes and 2 at the cap |
| F6 | Pass | Hidden canonical sequence, including give-up leaving 30 / 30 / 1 and the following complete-25 reaching 55 / 50 / 2 |
| F7 | Pass | Hidden late-resolution and post-midnight cases. `applySessionRewards` calls `feedingDayOf(session.endTime, timeZone)` and does not use `now` for the day (`void now`) |

### Architecture (A1–A4)

| ID | Result | Evidence |
| --- | --- | --- |
| A1 | Pass | Domain modules are pure TypeScript plus `Intl.DateTimeFormat`. No file, network, or database calls |
| A2 | Pass | `DAILY_FEEDING_MINUTES_CAP = 50`, `MINUTES_PER_APPLE = 25`, `MAX_APPLES_PER_FEEDING_DAY = 2`. Reward logic references those names. The only other `2` under `src/` is the Intl `"2-digit"` option |
| A3 | Pass | Tree is domain modules, colocated tests, package files, PRD, and issue. No routes, Prisma schema, or UI |
| A4 | Pass | No `sessionStorage`, `X-Session-Token`, or `SessionElsewhereNotice` in source |

Prompt-only score, ignoring A2: still pass on F1–F7, A1, A3, and A4. A2 does not change the comparison, because AFTER also passes A2.

### Input validation

Issue #11 does not add Zod. None was added.

| ID | Result | Evidence |
| --- | --- | --- |
| V1 | Pass | A non-completed session returns the current state unchanged. Abandoned hidden cases stay at zero or keep 15 / 15 / 0 |
| V2 | Pass | Feeding minutes change only by adding the completed duration and then applying the 50 cap. The 40 + 50 hidden case credits 10 and leaves 50 |
| I1 | Pass | Completed coins are `durationMinutes` for any length the function receives. There is no second coin or apple rate, and no throw for a duration other than 15, 25, or 50 |

### Code organization

| Piece | What was generated |
| --- | --- |
| Modules | `constants.ts`, `types.ts`, `feedingDay.ts`, `rewards.ts`, `index.ts` |
| Tests | `src/lib/domain/rewards.test.ts` (13 tests) and `feedingDay.test.ts` (3 tests), colocated with source |
| Status literals | `"Completed"` \| `"Abandoned"` |
| State literals | `"Starving"` \| `"Hungry"` \| `"Full"` |
| Main entry | `applySessionRewards` |
| Daily reset | `rewardStateAsOf`, and also inside `applySessionRewards` when `current.feedingDay` differs from the session day (minutes restart at 0, coins are kept) |
| `now` on apply | Accepted and intentionally unused for the credit path |

Generation order in the transcript: constants, types, feeding day, rewards, and barrel were written, then the test files, then `npm test`. The first test run passed. There was no observed red step. The agent’s closing note says 16 unit tests passed. This evaluation re-ran them: **16 passed, 0 failed.**

### Coverage

v8, own tests only, measured in this evaluation:

| File | Lines | Branches | Functions |
| --- | --- | --- | --- |
| `constants.ts` | 100% | 100% (0/0) | 100% |
| `feedingDay.ts` | 100% | 100% (4/4) | 100% |
| `index.ts` | 100% | 100% (0/0) | 100% |
| `rewards.ts` | 100% | 100% (24/24) | 100% |
| `types.ts` | 0% (0/18) | 0% (0/1) | 0% (0/1) |
| **Directory total** | **86.86% (119/137)** | **96.55% (28/29)** | **91.66% (11/12)** |

`types.ts` is type aliases only. V8 still counts it, including one uncovered branch and one uncovered function. The executable modules are fully covered: 119/119 lines and 28/28 branches once that file is set aside. The generation transcript does not show `npm run test:coverage`. The numbers above are from this evaluation.

Against the baseline’s “`src/lib/domain/` ≥ 95% lines and branches,” the raw directory line total is 86.86%. That miss is the type-only file, not an untested reward branch.

---

## AFTER results

Workspace: `/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-after`  
Transcript: `36ddbd84-65d1-400e-8999-b241567f1802`  
Model self-report: Cursor Grok 4.6  
Rules file: `AGENTS.md`, byte-identical to `HW3_AGENTS_BASELINE.md`. The transcript shows a `Read` of that file before tests were written.

### Hidden tests

**14 passed, 0 failed.** Vitest 3.2.4, 2026-10-27 21:41:27 PDT, duration 220 ms. Exit 0.

The same 14 cases passed. AFTER already emits `COMPLETED` / `ABANDONED` and `STARVING` / `HUNGRY` / `FULL`, so the adapter does not translate those literals. It still derives the two delta fields, which `calculateRewards` does not return. `calculateRewards` takes `currentCoins` and `currentFeedingMinutes` and does not take `prior.apples`; apples are recomputed from minutes. The hidden priors are consistent with that formula (0, 15, 30, 40, and 50 minutes).

### TypeScript

`npm run typecheck` → **exit 0, no diagnostics.**

During generation the agent removed a circular import between `feedingDay.ts` and `rewards.ts`. The scored tree is the final one.

### Acceptance criteria (F1–F7)

| ID | Result | Evidence |
| --- | --- | --- |
| F1 | Pass | `src/lib/domain/feedingDay.ts` and `rewards.ts` |
| F2 | Pass | `calculateRewards` takes `now` and `timeZone` on its input. `progressForFeedingDay(stored, now, timeZone)` and `getFeedingDay(instant, timeZone)` take them as arguments. No `Date.now`, no `new Date(`, no Prisma under `src/` |
| F3 | Pass | Same hidden cases. `coinsEarned` returns `durationMinutes` only for `COMPLETED` |
| F4 | Pass | `Math.min(uncapped, MAX_FEEDING_MINUTES_PER_DAY)` with `MAX_FEEDING_MINUTES_PER_DAY = APPLE_MINUTES * MAX_APPLES_PER_DAY` (50). Discarded minutes are the remainder |
| F5 | Pass | `min(MAX_APPLES_PER_DAY, floor(minutes / APPLE_MINUTES))`. Canonical hidden sequence matches |
| F6 | Pass | Same 15 → 15 → give up 25 → complete 25 sequence in the hidden suite and in `tests/unit/rewards.test.ts` |
| F7 | Pass | `calculateRewards` sets `feedingDay` from `getFeedingDay(input.endTime, input.timeZone)`. The late-resolution hidden test passed with `now` on 2026-10-29 |

`input.now` is part of `RewardInput` and is not read inside `calculateRewards`. The feeding day correctly follows `endTime`. Midnight reset is a separate function that does read `now`.

### Architecture (A1–A4)

| ID | Result | Evidence |
| --- | --- | --- |
| A1 | Pass | Pure functions and `Intl` only |
| A2 | Pass | `APPLE_MINUTES = 25`, `MAX_APPLES_PER_DAY = 2`, `MAX_FEEDING_MINUTES_PER_DAY` derived from those two. No bare 25, 50, or 2 in the arithmetic |
| A3 | Pass | Domain modules, `tests/unit/`, package files, PRD, issue, and `AGENTS.md`. No routes, Prisma, or UI |
| A4 | Pass | No session-token implementation in source |

Prompt-only score, ignoring A2: pass on F1–F7, A1, A3, and A4.

### Input validation

| ID | Result | Evidence |
| --- | --- | --- |
| V1 | Pass | Non-completed status returns the current coins and feeding minutes with `discardedMinutes: 0` |
| V2 | Pass | The only feeding-minute reduction is the daily cap. Hidden 40 + 50 credits 10 and stores 50 |
| I1 | Pass | Coin credit is the completed duration in minutes. No alternate rate and no duration guard |

### Code organization

| Piece | What was generated |
| --- | --- |
| Modules | `feedingDay.ts`, `rewards.ts` (types and constants live in `rewards.ts`) |
| Tests | `tests/unit/rewards.test.ts` (11 tests) and `tests/unit/feedingDay.test.ts` (5 tests) |
| Status literals | `"COMPLETED"` \| `"ABANDONED"` |
| State literals | `"STARVING"` \| `"HUNGRY"` \| `"FULL"` |
| Main entry | `calculateRewards` |
| Daily reset | `progressForFeedingDay` only. `calculateRewards` always adds `currentFeedingMinutes` and does not look at a stored day |
| Comments | `// US6: credit the feeding day of scheduled endTime, even if now is later.` and `// US6: daily reset clears apples and feeding minutes; coins never reset.` |

Generation order: both test files were written first; `npm test` failed because the modules were missing; then `feedingDay.ts` and `rewards.ts` were added. That is an observed red step. The session did not stop for test approval, and it did not create the `test:` / `feat:` commits the baseline asks for. The agent reported typecheck, 16 tests, and 100% domain coverage. This evaluation reproduced typecheck exit 0, **16 passed / 0 failed**, and **100% lines, branches, and functions** on both domain files (100/100 lines, 20/20 branches, 8/8 functions).

The coverage HTML already in the AFTER workspace is timestamped 21:18:02, from generation. This evaluation wrote its coverage report under `hw3-experiment/eval-run/logs/coverage-after/` and did not replace that HTML. The independent json-summary matches the 100% claim.

---

## Side-by-side comparison

| Metric | BEFORE | AFTER |
| --- | --- | --- |
| Hidden tests | 14 passed, 0 failed | 14 passed, 0 failed |
| Typecheck errors | 0 | 0 |
| Own unit tests | 16 passed, 0 failed | 16 passed, 0 failed |
| F1–F7 | 7 / 7 | 7 / 7 |
| A1–A4 | 4 / 4 | 4 / 4 |
| Prompt-only (F1–F7, A1, A3, A4) | Pass | Pass |
| V1, V2, I1 | Pass | Pass |
| v8 lines, all instrumented domain files | 86.86% (119/137) | 100% (100/100) |
| v8 lines, executable modules | 100% (119/119) | 100% (100/100) |
| v8 branches, executable modules | 100% (28/28) | 100% (20/20) |
| Invented coin or apple rate | No | No |
| HTTP, Prisma, UI, session tokens | Absent | Absent |

Functional outcome: **tie.** The hidden suite, the acceptance checks, and the compiler do not show AFTER ahead of BEFORE.

### Behavioral difference the hidden suite does not score

Both credit a completed session onto the feeding day of `endTime`, cap feeding minutes at 50, leave coins uncapped, and leave an abandoned session’s totals unchanged.

They split the midnight reset differently:

- BEFORE’s `applySessionRewards` treats prior feeding minutes as zero when `current.feedingDay` is not the session’s end day, and still adds coins. `rewardStateAsOf` does the same reset when the state is only being viewed.
- AFTER’s `calculateRewards` always adds `currentFeedingMinutes`. The caller is expected to pass a snapshot already on that day. `progressForFeedingDay` performs the midnight reset.

The experiment plan allows both shapes. The hidden `prior` object has no feeding day, and the adapters treat it as the day of `endTime`. A prior from a different feeding day was not measured. This is not a hidden-test failure for either side.

### Differences that match the rules file

These showed up with AFTER and were absent, or different, with BEFORE. AFTER’s transcript reads `AGENTS.md` before writing tests. The shared prompt does not mention these conventions.

| Observed difference | Baseline rule | Confidence |
| --- | --- | --- |
| Tests live in `tests/unit/`, not beside `src/lib/domain/` | §6 test-level table: unit tests in `tests/unit/` | High. The prompt does not name a test directory. BEFORE colocated tests, which the prompt also allows |
| State literals `STARVING` / `HUNGRY` / `FULL` | §4 enum values are `UPPER_CASE`. §8 writes `` `0 → STARVING` `` | High that the rules file is the source of the spelling. The shared prompt and the PRD table say “Starving, Hungry, Full.” BEFORE followed that wording. AFTER followed §8. This is rules influence, and it is not a more accurate reading of the PRD prose |
| Status literals `COMPLETED` / `ABANDONED` | Same enum rule. The prompt says “Completed” and “Abandoned” | High, same reason |
| Constants named `APPLE_MINUTES` and `MAX_APPLES_PER_DAY` | §4 example is exactly `APPLE_MINUTES = 25` | Moderate. Both runs extracted named constants (A2 passes both). Only the identifiers match the baseline examples |
| Main function named `calculateRewards` | §4 example list includes `calculateRewards` | Moderate. It is also an ordinary name for this task |
| `// US6:` comments on feeding-day credit and midnight reset | §5: reference the user story on non-obvious rules, with `// US6:` as the example | High. BEFORE’s comments describe the same rules without a story id |
| Tests written, then `npm test` failed on missing modules, then implementation | §6 red → green | Moderate. The red step was observed only in AFTER. The baseline also says to wait for approval and to commit the red tests. AFTER did neither. BEFORE wrote implementation files before test files, and the first `npm test` passed |
| Generation run included `npm run test:coverage` | Coverage goals and “run the relevant test commands” before calling the task done | Moderate. Both final trees have fully covered executable reward code when measured here. The difference is that AFTER ran coverage during generation |

### Differences that cannot be attributed to `AGENTS.md` with confidence

| Observation | Why it is not a clean rules effect |
| --- | --- |
| Identical hidden-test and typecheck results | There is no functional gap for the rules file to explain |
| BEFORE also used named constants and pure `now` / timezone parameters | The prompt and the PRD already require those. A2 and F2 would have passed without the baseline |
| BEFORE’s extra files (`constants.ts`, `types.ts`, `index.ts`) | The baseline allows noun-based domain modules and does not forbid a barrel or a types file. This is layout variation |
| Where midnight reset lives (`applySessionRewards` vs `progressForFeedingDay`) | The plan explicitly accepts a current-day prior snapshot. Both designs keep coins and clear apples and minutes on a new day. The baseline does not pick one function |
| Both feeding-day functions use `Intl.DateTimeFormat` `en-US` `formatToParts` | Shared approach from the same model and the same PRD sentence. The baseline says to use `Intl` and forbids Moment, which is also what a model often does unprompted |
| 16 own tests on each side | Similar thoroughness. The case lists are not the same, and the hidden suite is the common measure |
| Neither git repo has a commit | The baseline’s TDD commits are missing on both sides, including AFTER. A user-level “do not commit unless asked” rule, if it was active in both windows, would suppress those commits. That rule is not visible in these transcripts, so the missing commits are not evidence about `AGENTS.md` |
| The missing `U` on BEFORE’s wrapper sentence | The fenced prompt was intact. No output difference tracks that character |
| User-level Cursor rules outside either workspace | The plan already flags this. Both runs produced tests, named constants, and pure functions, which the prompt also demands. It can still have pushed both toward the same style |

---

## Specific code examples

### Same feeding-day rule, different state spelling

BEFORE maps apples with the PRD’s title case and ignores `now` when assigning the day:

```53:61:/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-before/src/lib/domain/rewards.ts
export function feedingStateFromApples(apples: number): FeedingState {
  if (apples >= MAX_APPLES_PER_FEEDING_DAY) {
    return "Full";
  }
  if (apples === 1) {
    return "Hungry";
  }
  return "Starving";
}
```

```112:131:/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-before/src/lib/domain/rewards.ts
  if (session.status !== "Completed") {
    return current;
  }

  const sessionDay = feedingDayOf(session.endTime, timeZone);
  const minutesOnSessionDay =
    current.feedingDay === sessionDay ? current.feedingMinutes : 0;
  const addedMinutes = feedingMinutesFromSession(
    session.status,
    session.durationMinutes,
  );
  const { feedingMinutes } = applyDailyFeedingCap(
    minutesOnSessionDay,
    addedMinutes,
  );

  return {
    coins: current.coins + coinsFromSession(session.status, session.durationMinutes),
    ...feedingFields(feedingMinutes, sessionDay),
  };
```

AFTER uses the baseline’s uppercase tokens, cites US6, and always adds the minutes it was given:

```3:7:/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-after/src/lib/domain/rewards.ts
export const APPLE_MINUTES = 25;
export const MAX_APPLES_PER_DAY = 2;
export const MAX_FEEDING_MINUTES_PER_DAY = APPLE_MINUTES * MAX_APPLES_PER_DAY;

export type SessionStatus = "COMPLETED" | "ABANDONED";
```

```74:96:/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-after/src/lib/domain/rewards.ts
export function calculateRewards(input: RewardInput): RewardResult {
  // US6: credit the feeding day of scheduled endTime, even if now is later.
  const feedingDay = getFeedingDay(input.endTime, input.timeZone);

  if (input.status !== "COMPLETED") {
    return totalsFrom(
      input.currentCoins,
      input.currentFeedingMinutes,
      0,
      feedingDay,
    );
  }

  const coins = input.currentCoins + input.durationMinutes;
  const uncappedMinutes = input.currentFeedingMinutes + input.durationMinutes;
  const feedingMinutes = Math.min(
    uncappedMinutes,
    MAX_FEEDING_MINUTES_PER_DAY,
  );
  const discardedMinutes = uncappedMinutes - feedingMinutes;

  return totalsFrom(coins, feedingMinutes, discardedMinutes, feedingDay);
}
```

The PRD line that both workspaces had is: “States: Starving = 0 apples, Hungry = 1, Full = 2.” The baseline line only AFTER had is: “Feeding state: `0 → STARVING`, `1 → HUNGRY`, `2 → FULL`.” The baseline’s own §6 example, a few lines later, switches back to “Starving” and “Hungry.” The rules file is internally mixed, and AFTER followed the uppercase invariant.

### Test placement

BEFORE: `src/lib/domain/rewards.test.ts`.  
AFTER: `tests/unit/rewards.test.ts`.

Both files assert the same §6 sequence totals: 15/15/0, then 30/30/1, then unchanged on give-up, then 55/50/2. The hidden suite asserts those totals again, plus `coinsDelta` and `feedingMinutesCredited`, and both implementations satisfy them through the adapters.

### Cap and abandoned behavior the hidden tests actually executed

For a completed session, both add one coin per duration minute and then cap feeding minutes at 50. The hidden case “already at 40, complete 50” expects coins 90, feeding minutes 50, apples 2, `coinsDelta` 50, `feedingMinutesCredited` 10. Both passed.

For an abandoned session, BEFORE returns the previous object. AFTER rebuilds totals from the previous coins and minutes with a zero discard. The hidden case with prior `{ coins: 30, feedingMinutes: 30, apples: 1 }` expects those totals, `HUNGRY`, and both deltas 0. Both passed. The BEFORE adapter is what uppercases `Hungry` to `HUNGRY` for that assertion.

---

## Test evidence

### Hidden suite (identical file, both adapters)

Command shape:

```bash
cd hw3-experiment/eval-run/before && ./node_modules/.bin/vitest run --reporter=verbose
cd hw3-experiment/eval-run/after && ./node_modules/.bin/vitest run --reporter=verbose
```

| # | Test | BEFORE | AFTER |
| --- | --- | --- | --- |
| 1 | complete 15 from zero → 15 / 15 / 0 / STARVING | pass | pass |
| 2 | second complete 15 → 30 / 30 / 1 / HUNGRY | pass | pass |
| 3 | give up 25 after the sequence above → unchanged | pass | pass |
| 4 | complete 25 → 55 / 50 / 2 / FULL, 20 minutes credited | pass | pass |
| 5 | complete 25 from zero → 25 / 25 / 1 | pass | pass |
| 6 | complete 50 from zero → 50 / 50 / 2 | pass | pass |
| 7 | complete 15 at 50 minutes → coins 65, minutes stay 50, credit 0 | pass | pass |
| 8 | complete 50 at 40 minutes → minutes 50, credit 10, coins 90 | pass | pass |
| 9 | abandoned 15 from zero stays zero | pass | pass |
| 10 | abandoned 50 does not remove 15 / 15 / 0 | pass | pass |
| 11 | `endTime` 2026-10-28T06:30:00.000Z in `America/Los_Angeles` is feeding day 2026-10-27 even when `now` is 2026-10-29 | pass | pass |
| 12 | `endTime` 2026-10-28T07:30:00.000Z is feeding day 2026-10-28 | pass | pass |
| 13 | 0 / 1 / 2 apples map to STARVING / HUNGRY / FULL | pass | pass |
| 14 | two calls, same snapshot, equal results; contract prior unchanged | pass | pass |

No hidden test was skipped, and none was edited.

### Own tests and compiler

| Command | BEFORE | AFTER |
| --- | --- | --- |
| `npm run typecheck` | exit 0, no error text | exit 0, no error text |
| `npm test` | 2 files, 16 tests, exit 0 (`rewards.test.ts` 13, `feedingDay.test.ts` 3) | 2 files, 16 tests, exit 0 (`rewards.test.ts` 11, `feedingDay.test.ts` 5) |
| `vitest run --coverage` | see the BEFORE coverage table | 100% lines, statements, branches, and functions on `feedingDay.ts` and `rewards.ts` |

There is no `lint` script in either `package.json`. Lint was not run. AFTER’s generation note says the same thing. That is a missing script in the seed, shared by both conditions.

---

## Limitations

- **Model identity is self-reported.** Both closing messages say “Cursor Grok 4.6.” Chat URLs were not shown in the UI. This evaluation did not find a separate model-picker record for those conversation ids. The transcripts are each a single user turn followed by one agent session, which is what the plan asked for.
- **The message around the prompt was not perfectly identical.** One leading `U` differs. The fenced §5 prompt does not.
- **Adapters sit between the hidden tests and the code.** They translate names and compute deltas. They do not change rates. BEFORE’s state-mapping test passes because the adapter uppercases `Starving`, `Hungry`, and `Full`. The raw literals differ, and the report counts that as a naming difference, not as a hidden-test failure. The plan says to adapt names.
- **Purity is checked on the contract object.** The adapter copies `prior` into each implementation’s state shape. The hidden test shows that this copy’s source object is unchanged and that two calls return equal results. It does not pass the implementation’s own object by reference. Source inspection shows neither apply function assigns into the caller’s fields. BEFORE returns the same object reference for an abandoned session; the adapter then reads fields off it.
- **Cross-day priors were not in the hidden file.** The plan allows a current-day snapshot. The reset-ownership difference is described above and was not scored as pass or fail.
- **Coverage of `types.ts` is a tooling artifact.** Scoring the BEFORE directory at 86.86% lines treats type aliases as uncovered statements. Executable reward code on that side is 100% lines and branches.
- **Node v24.14.0 ran the tests.** The app spec says Node 22. Both conditions used v24, so this does not bias the comparison. Results on Node 22 were not measured.
- **User-level Cursor rules could have applied to both windows.** The plan already states this residual risk. It is a reason to be careful about attributing shared behavior, not a reason to ignore the differences that track rules only AFTER could read.
- **No database, HTTP, or UI behavior was in scope.** Exactly-once reward transactions are Issue #15. These results say nothing about them.
- **Generation and evaluation were not blind to the hypothesis in the sense that the workspaces are named before and after.** The scores come from Vitest and `tsc`, not from a judgment that AFTER should win.

---

## Recommendations for rules refinement

These follow the measurements above. They are changes to consider in the live rules file later. This evaluation did not edit `AGENTS.md` or the baseline.

1. **Pick one spelling for feeding state and status, and use it in the PRD, §8, the §6 example, and the implementation prompt.** Today the PRD and the prompt say “Starving.” Baseline §8 says `STARVING`, and the baseline example says “Starving” again. AFTER followed §8. BEFORE followed the prompt and the PRD. Hidden tests use uppercase, so an adapter was required for BEFORE. A single canonical token would remove a false “architecture” gap and would stop the rules file from overriding the prompt’s product words.

2. **Keep the test-directory and US6-comment rules if the goal is consistency.** They are the clearest effects in this experiment: AFTER put tests in `tests/unit/` and marked the feeding-day rule with `// US6:`. BEFORE did not. Neither change affected the 14 hidden tests. State that these rules are for reviewability, so a later experiment does not treat them as evidence of reward correctness.

3. **Do not expect the named-constant rule to move correctness on a task whose prompt already states 25, 50, and 2.** Both runs passed A2. The prompt was enough. The rule still shaped AFTER’s identifier choices (`APPLE_MINUTES`, `MAX_APPLES_PER_DAY`). If that naming matters, the issue should show the identifiers. If it does not, A2 should stay out of the functional score, which this plan already does via the prompt-only score.

4. **Say which function owns the midnight reset.** Both designs match the plan. They will diverge if a caller passes yesterday’s feeding minutes into AFTER’s `calculateRewards` without calling `progressForFeedingDay` first. BEFORE clears those minutes inside apply. A signature in Issue #11, including whether `prior` carries `feedingDay`, would make the next hidden suite runnable without an adapter judgment.

5. **Make the TDD ceremony match the experiment prompt.** The baseline says: propose tests, wait for approval, commit red, then commit green. The experiment prompt says to implement the module in one shot and does not ask for commits. AFTER produced a red `npm test` and then kept going. Neither side committed. Either tell the implementation prompt to commit, or change the rule so a one-shot task is not graded on commits and on waiting. As written, full TDD compliance was impossible without violating the experiment prompt or a standing “do not commit unless asked” instruction.

6. **Exclude type-only files from the domain coverage gate, or say that they count.** BEFORE’s executable modules are at 100% lines. The directory total is 86.86% because `types.ts` has no runtime code. A 95% gate on `src/lib/domain/**` would fail a correct solution for that reason alone.

7. **Leave the “do not invent unspecified behavior” sentence.** Both runs applied one coin per minute and the 25/50/2 feeding rules without a second rate, and neither threw on durations outside 15, 25, and 50. That matches the plan’s I1 note. The rule did not have to create a difference to be the right instruction.
