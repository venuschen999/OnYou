# HW3 PRD v2.9 Sync Report — OnYou

**Team Member B:** CollinsCao  
**Date:** 2026-10-27  
**Scope:** Documentation and GitHub Issue text only  
**Before/After Experiment started:** No  
**Application code implemented:** None

---

## Summary

Planning artifacts were synchronized to **PRD Version 2.9** and `OnYou_web_mockups.html` without changing the 30-issue Scrum structure.

The product change that drove the edit is the session model: v2.0 used a starting-tab `sessionStorage` completion token; v2.9 uses **account-owned sessions**, **heartbeats every 10 seconds**, and a **30-second presence deadline**. All 30 GitHub issues still exist. Sprint 1 remains due **2026-11-02**; Sprint 2 remains due **2026-11-11**. Board status is unchanged: issues **#1–#18** in **Sprint Todo**, **#19–#30** in **Backlog**.

Live rules file: `AGENTS.md` (version 3).  
Pre-update copy: `HW3_AGENTS_pre_v2_9.md`.  
Frozen experiment baseline: `HW3_AGENTS_BASELINE.md` (must not be edited during the Before/After Experiment).

---

## 1. Summary of PRD changes (v2.0 → v2.9)

Unchanged: eight user stories; 15/25/50-minute durations; one Active session per account; coin and apple math; input limits; password-reset mechanics; shops/partners/pause still out of scope.

Replaced:

| v2.0 | v2.9 |
| --- | --- |
| Starting tab holds a completion token in `sessionStorage` | Session belongs to the account; no completion token |
| Only the token tab can complete | Any authenticated owning tab can heartbeat, give up, or complete |
| Other tabs see “running in another tab or closed” | Other tabs **join** the same Active session |
| Closing the starting tab fails the session | Closing some tabs is fine if another tab heartbeats |
| Sleep/network do not fail while the starting tab stays open | A **≥ 30 second** gap with no heartbeat abandons, including sleep and network loss |
| Missing token after end time → Abandoned | Outcome = presence deadline **strictly later** than scheduled end → Completed; otherwise Abandoned |

Also specified: default pet name **Mochi**; HTML mockup as layout/copy/art source; Home / History / Settings nav; active session bar; connection warning; result tiles for coins, feeding minutes, and apples.

Planning file `table.tsv` was updated to match the same session rows and dependency graph. Previous PRD files were **not** deleted.

---

## 2. Dependency changes (documented, then applied)

These were proposed in `HW3_PRD_Update_Analysis.md` and approved before this sync. They are required because heartbeat/presence (#14) must exist before Focus UI, completion, give-up-after-end, E2E multi-tab, and OpenAPI heartbeat.

| Issue | Previous blocked-by | Applied blocked-by |
| --- | --- | --- |
| #13 | #12 | **#12, #14** |
| #14 | #13 | **#12** |
| #15 | #11, #12 | **#11, #12, #14** |
| #17 | #12, #13 | **#12, #13, #14** |
| #26 | #16, #17, #23 | **#16, #17, #23, #14** |
| #27 | #7, #22, #25 | **#7, #22, #25, #14** |

All other blocked-by links are unchanged. No issues were created, closed, or moved between sprints.

Label change applied: **#14** `priority:medium` → **`priority:high`** (presence is now the session invariant). Other priority labels unchanged.

Titles were updated only where the old title still encoded the obsolete token model (otherwise agents would treat the title as the spec): **#12, #13, #14, #15, #16**. Issue numbers, assignees, and milestones were not changed.

---

## 3. GitHub Issues modified

All **30** issue bodies were rewritten to cite PRD v2.9 and to prohibit the obsolete token model in Notes. Substantive acceptance-criteria changes are below.

### 3.1 Setup / schema / docs (supporting the new session fields)

| Issue | Acceptance-criteria changes |
| --- | --- |
| **#1** | AGENTS.md must reference PRD v2.9, the HTML mockups, and the token prohibition |
| **#5** | FocusSession stores `startTime`, `endTime`, `lastHeartbeatAt`, status; **no** completion `tokenHash` |
| **#6** | Smoke E2E must not require a sessionStorage focus-session token |
| **#7** | OpenAPI skeleton includes `POST /api/sessions/{id}/heartbeat`; no `X-Session-Token` |
| **#8** | Capture IANA timezone at signup and keep it fixed |
| **#9** | Mockup auth errors; generic login error; Home / History / Settings nav |
| **#10** | Default name **Mochi**; blank restore; optional Home “Name your pet”; reuse mockup SVG |

### 3.2 Issues #11–#18 (primary session/reward rewrite)

| Issue | What changed |
| --- | --- |
| **#11** | Canonical unit test is the **v2.9 §6 sequence** (15 → 15 → give up → 25 with 5 minutes discarded), not v2.0’s 15-then-10. Feeding minutes cap and discard are explicit. Presence math stays on #14. |
| **#12** | Start API records the **first heartbeat**. No completion token. Resolve a **stale ACTIVE** session before a new start. Any later owning tab can join. |
| **#13** | Heartbeats every **10s**, kept across navigation; refresh and extra tabs **join**; connection warning; task over 80 disables Start; Start button names the duration; **no** `sessionStorage` token. Depends on #14. |
| **#14** (repurposed) | Heartbeat endpoint + presence deadline (`lastHeartbeatAt + 30s`) + shared resolution routine. Completes iff deadline **strictly later** than scheduled end. Concurrent heartbeats cannot revive Abandoned or overwrite newer state. Sleep/network ≥ 30s abandons. Closing all tabs **&lt; 30s** before end can still complete. Closing after completion does not revoke rewards. **Removes** SessionElsewhereNotice. Priority **high**. Blocked by **#12** only. |
| **#15** | Any owning tab may complete. Reject before scheduled end. Complete only if presence deadline **&gt;** scheduled end. Completion **after** a missed presence deadline does not award rewards. Concurrent completion cannot double-award. No `X-Session-Token`. Depends on **#14**. |
| **#16** | Result shows **coins, feeding minutes, and apples**, including no-apple-yet, already Full, and cap-discard copy; Back to dashboard and Start another session. |
| **#17** | Give up from **every** tab; ends the session in every tab. After scheduled end, complete **only if presence was met**. Slap + reduced motion. Depends on **#14**. |
| **#18** | Logout confirm abandons on **all devices**. No token to erase. Stay logged in cancels. |

### 3.3 Issue #26 and remaining Sprint 2

| Issue | Acceptance-criteria changes |
| --- | --- |
| **#19** | Feeding minutes toward the next apple; coins never reset |
| **#20** | Mockup SVG states; active session bar; Start focusing disabled; loading / Couldn’t load |
| **#21** | Still scheduled-end feeding day; explicitly does **not** reintroduce missing-token abandonment |
| **#22** | Abandoned items expose zero coins and zero feeding minutes |
| **#23** | Desktop table / phone cards; Load more loading; **end-of-list note**; “No rewards” |
| **#24** | Unchanged behavior; source line now v2.9 |
| **#25** | Mockup reset screens; Password updated notice; reset **does not abandon** in the reset handler (US2); ask Team Member A if a remaining presence interaction is unclear |
| **#26** | Full loop plus **second tab join** and **give up from a second tab**; no sessionStorage token assertions; depends on **#14** |
| **#27** | Document heartbeat; no token header; depends on **#14** |
| **#28** | Schema includes `lastHeartbeatAt`, not `tokenHash` |
| **#29** | Link PRD v2.9 and HTML mockups; do not describe the token model |
| **#30** | 1040 / 390 / &lt;600px; 16px inputs; bottom sheets; session bar; Home nav |

Issues **#2, #3, #4** received source-line and prohibition notes only (CI, Vercel/Neon, security scanning).

---

## 4. AGENTS.md modifications

**Pre-update file kept:** `HW3_AGENTS_pre_v2_9.md` (version 2, 26102 bytes).  
**Live file:** `AGENTS.md` (version 3, 31802 bytes).

Kept unchanged except where they conflicted with v2.9: stack pins, layering, TDD, coverage, coding standards, Scrum workflow, preferred libraries, JWT/`tokenVersion`, bcrypt, accessibility baseline.

Updated:

- §0 / §7.1 point to `OnYou_PRD_v2_9.md` and `OnYou_web_mockups.html`. Older PRDs are historical.
- §1 account-owned sessions; keep **at least one authenticated tab connected**; obsolete token model listed as **do not implement**.
- §3 `useHeartbeat` over existing `fetch` (not a new library). Prisma example field `lastHeartbeatAt`.
- §6 tests cover PRD v2.9 §11 presence/multi-tab cases; forbid sessionStorage token tests.
- §7.2–7.4 Home nav, session bar, connection warning, join-on-every-tab flows; **removed** `SessionElsewhereNotice`.
- §8 presence invariants: 10s heartbeat, 30s grace, deadline **strictly later** than `endTime` for Completed.
- §8 rewards example replaced with the v2.9 table; default pet name **Mochi**.
- §9 adds `POST /api/sessions/{id}/heartbeat`; forbids `X-Session-Token`.
- §11 Do: send heartbeats. Don’t: sessionStorage completion tokens, WebSockets, unload events.
- §12 hashed tokens apply to **password reset only**, not focus sessions.
- §14 changelog version 3; `HW3_AGENTS_BASELINE.md` called out as frozen.

No new libraries. Heartbeats are ordinary authenticated HTTP.

---

## 5. Experiment baseline location

| File | Role |
| --- | --- |
| `HW3_AGENTS_pre_v2_9.md` | Copy of `AGENTS.md` **before** the v2.9 edit |
| `AGENTS.md` | Live agent rules (version 3) |
| `HW3_AGENTS_BASELINE.md` | Byte-for-byte snapshot of the updated `AGENTS.md`, taken after this sync |

`HW3_AGENTS_BASELINE.md` **must remain unchanged** during the Before/After Experiment. Later rule refinements go in live `AGENTS.md` only after experimental observations.

---

## 6. Unresolved product ambiguities (for Team Member A)

These were **not** decided in issue text. Issues tell the agent to stop and ask if they come up.

1. **Mockup vs PRD version string.** `OnYou_web_mockups.html` intro still says “PRD v2.8”. Implementation should follow **`OnYou_PRD_v2_9.md`** for behavior and the HTML file for layout/copy/art.
2. **Password reset vs an Active focus session (US2).** v2.9: reset does not abandon in the reset handler; signing out stops heartbeats; the session survives only if the user logs in again and a tab heartbeats before the presence deadline. #25 records that split and does not invent a server-side “keep-alive while logged out” exception.
3. **Background-tab timer throttling.** v2.9 asks tests to include “background-tab delays” but does not say what to do if the browser throttles `setInterval` past 30 seconds while a tab is open in the background. Do not invent a web-worker or extra heartbeat channel unless A confirms.
4. **Libraries.** v2.9 defers specific libraries to a technical specification. `AGENTS.md` keeps the existing Next.js / Prisma / `jose` / Neon / Vercel pins rather than introducing new ones.

No other edge cases from the request were filled in beyond the PRD:

- Concurrent heartbeats → #14 (cannot overwrite newer state or revive Abandoned).  
- Concurrent completion → #15 (exactly once; retries return stored outcome).  
- Browser sleep / temporary network → #14 (30s with no accepted heartbeat abandons, even if a tab is still open; connection warning is UI on #13).  
- Completion after presence deadline → #15 (no complete / no rewards if deadline was at or before scheduled end).

---

## 7. Verification results

Checked after the edits, using the GitHub CLI/API (`gh issue list`, `gh issue view`, `gh api repos/venuschen999/OnYou/milestones`, `gh project item-list 3 --owner CollinsCao`).

| Check | Result |
| --- | --- |
| Re-read updated `AGENTS.md` | Version 3; domain §8 is heartbeat/presence |
| References `OnYou_PRD_v2_9.md` | Yes (§0, §7.1, architecture note) |
| References `OnYou_web_mockups.html` | Yes (§0, §7.1, §7.2) |
| No **active** instruction requires sessionStorage completion tokens | Pass. Mentions of `sessionStorage` / `X-Session-Token` / `SessionElsewhereNotice` are **prohibitions** only. The v2 “Keep the session token in sessionStorage” Do-rule is gone (it remains only in `HW3_AGENTS_pre_v2_9.md`) |
| Modified issues re-read via GitHub API | All 30 bodies include PRD v2.9 source; #12/#14/#15/#26 AC match heartbeat/presence/multi-tab |
| Exactly 30 issues exist | **30** (`#1`–`#30`); none created or deleted |
| Sprint 1 due date | **Unchanged** `2026-11-02T00:00:00Z` (18 open) |
| Sprint 2 due date | **Unchanged** `2026-11-11T00:00:00Z` (12 open) |
| Sprint assignments | #1–18 Sprint 1; #19–30 Sprint 2 |
| Project board statuses | **Unchanged:** 18 Sprint Todo, 12 Backlog, 0 In Progress / In Review / Done |
| #14 labels | `feature`, `priority:high` (medium removed) |
| Application code | **None.** No `src/**/*.ts(x)` (or other app implementation) added |

Spot-check (API):

- #14 title: `Implement session heartbeat API and presence-deadline resolution`; blocked by **#12**; 11 acceptance criteria.  
- #15 title: `Implement completion endpoint with presence checks and exactly-once rewards`.  
- #26 AC includes second-tab join and give-up from a second tab.

---

## 8. What was not done

- Before/After Experiment **not** started  
- No application features implemented  
- No new GitHub issues  
- No issue deletion/recreation  
- Milestone dates not changed  
- Project Board columns not moved  
- Previous PRD versions not deleted  

---

## 9. Next step (not started)

After Team Member A has no objection to the four ambiguities in §6, the HW3 Before/After Experiment may use:

- Issues `#1`–`#30` as updated  
- `HW3_AGENTS_BASELINE.md` as the frozen rules snapshot  
- Live `AGENTS.md` matching that snapshot until an experiment observation justifies a later edit
