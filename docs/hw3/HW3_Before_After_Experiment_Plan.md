# HW3 Before/After Experiment Plan — Issue #11 Reward Calculation

**Team Member B:** CollinsCao  
**Date:** 2026-10-27  
**Feature:** GitHub Issue #11 — pure reward calculation  
**Status:** Environment prepared. **Neither implementation has been started.**

---

## 1. Experimental hypothesis

**H1:** An otherwise identical Agent, given the same model, prompt, starting code, PRD v2.9, and Issue #11, will produce a more correct and more architecturally consistent reward module when the frozen `AGENTS.md` baseline is present than when it is absent.

**H0:** The presence of `AGENTS.md` does not improve Issue #11 outcomes on the evaluation metrics in §6.

This experiment measures **rules-file effectiveness**, not model quality. Only one independent variable changes: whether the frozen baseline `AGENTS.md` is in the workspace.

---

## 2. Workspaces prepared

| Condition | Path | `AGENTS.md` |
| --- | --- | --- |
| BEFORE | `/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-before` | **Absent** |
| AFTER | `/Users/collinscao/Documents/ai coding/project2/OnYou-experiment-after` | Exact copy of `HW3_AGENTS_BASELINE.md` |

Both sit **outside** the main OnYou git repository. Each has its own empty git repo (not a clone of OnYou).

Shared starting contents (byte-identical except `AGENTS.md` on AFTER):

- `OnYou_PRD_v2_9.md`
- `ISSUE_11.md` (verbatim GitHub Issue #11)
- `package.json` / `package-lock.json` (TypeScript 5.9.3, Vitest 3.2.4)
- `tsconfig.json` (`strict: true`), `vitest.config.ts`
- empty `src/lib/domain/` (`.gitkeep` only)
- `README.md` pointing at the PRD and issue
- installed `node_modules` from the same lockfile

Not copied into either workspace:

- `HW3_AGENTS_BASELINE.md` (AFTER received it **as** `AGENTS.md` only)
- Live `AGENTS.md` from the main repo (AFTER used the frozen baseline file)
- Older PRDs (`OnYou_PRD.md`, `OnYou_PRD v2.md`)
- HTML mockups (Issue #11 is domain logic)
- Hidden evaluation tests
- HW3 reports, `.scrum-setup`, `.cursor` rules

**Frozen baseline:** `OnYou/HW3_AGENTS_BASELINE.md` was not edited. `cmp` of that file against AFTER `AGENTS.md` succeeded. Main-repo `AGENTS.md` still matches the baseline.

---

## 3. Controlled variables

| Variable | Value |
| --- | --- |
| Feature | Issue #11 only |
| Product rules | `OnYou_PRD_v2_9.md` §6 (and feeding-day / timezone sentences) |
| Requirements text | `ISSUE_11.md` |
| Starting application code | Empty `src/lib/domain/`; no reward implementation |
| Dependencies | TypeScript 5.9.3, Vitest 3.2.4, `@vitest/coverage-v8` 3.2.4 |
| Implementation prompt | §5 of this document, pasted verbatim |
| Hidden tests | `hw3-experiment/hidden-eval/` (evaluator only) |
| Model | Same Cursor Agent model and version for both runs (record the exact name/version in the evidence log at start of each chat) |
| Conversation | **New Agent chat per workspace**; do not continue this planning chat |
| Human edits | None during generation, except answering a clarifying question the same way in both chats if both ask |

**Independent variable:** presence of frozen `AGENTS.md`.

---

## 4. Reward formulas extracted from PRD v2.9 and Issue #11

No rates, caps, or rounding rules were invented. Durations in the MVP are whole minutes; the PRD does not define fractional-minute rounding.

| Quantity | Source | Rule |
| --- | --- | --- |
| Eligible sessions | PRD §6 | Only **Completed** sessions earn rewards |
| Abandoned | PRD §6, Issue #11 | Zero coins and zero feeding minutes, however long it ran. Does not remove existing rewards |
| Coins | PRD §6, Issue #11 | **One coin per minute of the session's duration** on Completed |
| Coins after Full | PRD §6 | Coins keep increasing; coins never reset |
| Feeding minutes | PRD §6, Issue #11 | Completed session **adds its duration**, then cap at **50** per feeding day; minutes beyond the cap are **discarded** |
| Apples | PRD §6, Issue #11 | **Every 25** feeding minutes → **one apple**, **at most 2 per feeding day** |
| Leftover | PRD §6, Issue #11 | Minutes not yet making a new apple carry within the **same feeding day** |
| States | PRD §6 | 0 apples → Starving; 1 → Hungry; 2 → Full |
| Feeding day | PRD §6, Issue #11 | Calendar day of the session **`endTime`** in the user's saved IANA timezone, even if resolved later. Credit never moves to a later day |
| Daily reset | PRD §6 | At midnight in that timezone, apples and feeding minutes return to zero; coins remain. Missed days have no penalty |
| Time injection | Issue #11, AGENTS baseline §8 | Domain functions take `now` and timezone; they must not read `Date.now()` or Prisma |
| Canonical example | PRD §6 table, Issue #11 AC | From zero on one feeding day: complete 15 → 15 / 15 / 0 / Starving; complete 15 → 30 / 30 (5 leftover) / 1 / Hungry; give up 25 after 10 min → unchanged; complete 25 → 55 / 50 (5 discarded) / 2 / Full |

**Not specified for this module (do not invent; do not fail a run for choosing a reasonable no-op):**

- Behavior of `applyRewards` if `durationMinutes` is not 15, 25, or 50 (session start validation is Issue #12)
- Database-level exactly-once transactions (Issue #15)
- Rounding of non-integer minutes (PRD uses integer durations)

**Feeding-day reset vs apply:** PRD says apples/minutes reset at midnight. Issue #11 does not require a single function to both detect a new day and apply a session. Score auto-reset if present (must keep coins, zero apples/minutes for the new day). If the implementation assumes `prior` is already the current feeding day's snapshot, that is acceptable; feeding-day **assignment** from `endTime` is still required.

---

## 5. Implementation prompt (paste identically)

Use a **new Agent conversation** in each workspace. Paste this text with no extra coaching. Do not attach the hidden-eval folder. Do not @ the main OnYou repo.

```
You are implementing only GitHub Issue #11 for the OnYou web MVP.

Authoritative product rules: OnYou_PRD_v2_9.md (especially section 6, Reward rules).
Issue text: ISSUE_11.md.

Implement pure domain functions for coins, feeding minutes, apples, leftover minutes, the daily feeding cap, feeding state, and feeding-day timezone rules.

Requirements:
- Put domain code under src/lib/domain/.
- Domain functions must take now and timezone as inputs. They must not read Date.now(), the clock, or a database/Prisma client.
- Only Completed sessions earn rewards. Abandoned sessions contribute zero coins and zero feeding minutes and must not remove existing rewards.
- Coins: one per minute of the completed session's duration. Coins never reset and keep increasing after the pet is Full.
- Feeding minutes: a completed session adds its duration, capped at 50 per feeding day. Minutes beyond the cap are discarded.
- Apples: every 25 feeding minutes gives one apple, up to two per feeding day. Leftover minutes carry within the same feeding day.
- States: 0 apples Starving, 1 Hungry, 2 Full.
- Feeding day is the session endTime converted to the user's IANA timezone, even if rewards are applied later. Do not credit a later day.
- Include unit tests for the PRD v2.9 section 6 example sequence starting from zero on one feeding day: complete 15 → 15 coins, 15 minutes, 0 apples; complete 15 → 30 coins, 30 minutes (5 leftover), 1 apple; give up a 25-minute session → unchanged; complete 25 → 55 coins, 50 minutes (5 discarded), 2 apples.

If OnYou_PRD_v2_9.md and ISSUE_11.md do not specify a behavior, do not invent product rules.

Do not implement other issues (no HTTP routes, no Prisma schema, no UI, no heartbeat/session token).
Do not modify files outside this workspace.
```

Record: chat URL, start time, model name/version shown in the UI.

---

## 6. Evaluation metrics

Score each condition independently with the same rubric. Use hidden tests plus inspection. Do not tune tests after seeing results.

### 6.1 Functional acceptance (Issue #11 checkboxes)

| ID | Criterion | Pass |
| --- | --- | --- |
| F1 | Code lives under `src/lib/domain/` | |
| F2 | `now` and timezone are parameters; no `Date.now()` / Prisma in domain | |
| F3 | Completed coins = duration minutes; abandoned → 0 coins and 0 feeding minutes | |
| F4 | Feeding minutes add duration then cap at 50; overflow discarded | |
| F5 | Apples = min(2, floor(feedingMinutes / 25)); leftover carries same day | |
| F6 | Canonical §6 sequence matches exactly | |
| F7 | Feeding day from `endTime` + IANA zone, not from `now` | |

### 6.2 Hidden unit tests

File: `hw3-experiment/hidden-eval/rewards.hidden.test.ts`  
Contract: `hw3-experiment/hidden-eval/rewards.contract.ts`

After generation, wire `rewards.adapter.ts` to that workspace's exports (names may differ). Then copy hidden tests **into a temp eval directory** or the workspace and run `npx vitest run` on them.

Metric: **passed / total** hidden tests (same file both times).

| Suite | What it covers |
| --- | --- |
| Canonical sequence | PRD table, including give-up-after-10-min of a 25-min session |
| Normal | Complete 25 and 50 from zero |
| Boundary | Already-full 50-minute day + another 15; 40 minutes + complete 50 (10 discarded) |
| Abandoned | Zero from empty; does not strip existing rewards |
| Timezone / late resolution | `endTime` 2026-10-28T06:30:00.000Z in `America/Los_Angeles` → feeding day `2026-10-27` even if `now` is 2026-10-29; post-midnight end → `2026-10-28` |
| State mapping | 0/1/2 |
| Purity | Same inputs twice → same output; prior object not mutated |

Invalid-input: PRD does not define domain errors for illegal durations. Hidden tests **do not** require throws. Inspection metric I1: the implementation does not invent a new coin or apple **rate** for unspecified inputs.

Concurrency: Issue #11 is pure functions. Hidden tests check referential transparency (two calls, same snapshot). They do **not** require database locks (that is Issue #15).

### 6.3 TypeScript / compiler

From each workspace: `npm run typecheck`. Metric: zero errors vs error count / messages.

### 6.4 Architectural consistency and organization

| ID | Criterion | Source |
| --- | --- | --- |
| A1 | No I/O in `src/lib/domain/` | Issue #11, baseline §3 |
| A2 | Named constants instead of bare `25` / `50` / `2` in logic | Baseline §5 (AFTER expected; BEFORE scored but not required by the prompt) |
| A3 | Did not implement HTTP, Prisma, UI, or session tokens | Issue #11 scope |
| A4 | Did not use `sessionStorage` completion tokens | Issue notes |

A2 is an **AGENTS.md-specific** organization check: report it, and also report a “prompt-only” score that ignores A2 so H1 is not circular.

### 6.5 Input validation

Issue #11 does not add Zod. Score:

- V1: Domain does not silently treat Abandoned as partial-credit minutes (would contradict PRD).
- V2: No silent truncation of feeding minutes except the specified 50-minute cap.

---

## 7. Evidence collection checklist

For **each** condition (BEFORE then AFTER):

- [ ] New Agent conversation (not this planning thread)
- [ ] Model name and version recorded
- [ ] Workspace path recorded; only that folder opened
- [ ] Prompt pasted verbatim from §5
- [ ] Hidden-eval folder **not** added to the workspace before generation
- [ ] Full Agent transcript saved
- [ ] `git status` / file tree after the run
- [ ] `npm run typecheck` output saved
- [ ] Implementation’s own tests: `npm test` output saved
- [ ] Adapter wired; hidden tests run; output saved
- [ ] Manual F1–F7 and A1–A4 checklist
- [ ] Note any invented rules or clarifying questions

After both runs:

- [ ] Compare hidden-test pass rates
- [ ] Compare typecheck
- [ ] Compare F1–F7
- [ ] Write the experiment results report (later; not this document)

---

## 8. How rule isolation was verified

Ran after workspace creation:

| Check | BEFORE | AFTER |
| --- | --- | --- |
| Outside main OnYou repo | Yes | Yes |
| `AGENTS.md` present | **No** | **Yes** |
| AFTER `AGENTS.md` `cmp` to `HW3_AGENTS_BASELINE.md` | n/a | Match |
| `.cursor/` directory | Absent | Absent |
| `.cursorrules` | Absent | Absent |
| Older PRDs | Absent | Absent |
| `rewards.hidden.test.ts` | Absent | Absent |
| `*.ts` under `src/` | 0 | 0 |
| `package-lock.json` identical | Yes | Yes |
| `OnYou_PRD_v2_9.md` / `ISSUE_11.md` identical | Yes | Yes |
| Diff of trees excluding `.git` and `node_modules` | — | **Only** `AGENTS.md` on AFTER |
| Main `HW3_AGENTS_BASELINE.md` / `AGENTS.md` unmodified | Confirmed still equal to each other | |

**Residual risk (cannot fully eliminate):** Cursor **user-level** rules or memories outside the repo. Mitigation: open each experiment folder as its own window, start a **new Agent chat**, do not attach the main OnYou workspace, do not paste `AGENTS.md` into the BEFORE prompt.

**Issue #11 note line** “Follow AGENTS.md TDD workflow” is part of the GitHub issue and is present in **both** `ISSUE_11.md` copies. BEFORE has that sentence but no rules file to follow. That is intentional fidelity to the issue, not a BEFORE rules file.

---

## 9. Restrictions observed

- Reward module **not** implemented in any workspace or in the main repo
- `AGENTS.md` and `HW3_AGENTS_BASELINE.md` in the main repo **not** modified
- GitHub Issues, Project Board, and milestones **not** modified
- Hidden tests **not** shown to an implementation Agent
- Experiment runs **not** started

---

## 10. Next step (not started)

1. Open `OnYou-experiment-before` in a new Cursor window → new Agent chat → paste §5.  
2. Independently open `OnYou-experiment-after` → new Agent chat → paste the same §5.  
3. After both finish, wire adapters and run `hw3-experiment/hidden-eval/rewards.hidden.test.ts`.
