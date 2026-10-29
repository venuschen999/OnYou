# HW3 PRD Update Analysis — OnYou

**Team Member B:** CollinsCao  
**Date:** 2026-10-27  
**Compared versions:** PRD v2.0 (`OnYou_PRD v2.md`) → PRD v2.9 (`OnYou_PRD_v2_9.md`)  
**Mockup:** `OnYou_web_mockups.html`  
**Planning baseline:** 30 GitHub issues `#1`–`#30` in [venuschen999/OnYou](https://github.com/venuschen999/OnYou), plus `AGENTS.md` v2 and `table.tsv`  
**Application code / GitHub Issues / Project Board / AGENTS.md modified:** None (analysis only)

---

## Summary

PRD v2.9 keeps the same eight user stories, the same durations, the same coin/apple math, and the same account/history/password-reset scope. The **session model is a breaking product change**: v2.0 used a **starting-tab session token** in `sessionStorage`; v2.9 uses **account-owned sessions plus heartbeats** (every 10 seconds, 30-second presence deadline). Every logged-in tab joins the same session and can complete or give up.

That change invalidates large parts of issues **#12–#18**, **#5**, **#11**, **#14**, **#15**, **#26**, **#27**, and the session sections of `AGENTS.md`. UI mockups also add screens and copy that issues **#9, #10, #16, #20, #23, #25, #30** do not currently require.

**Recommendation:** do **not** start the Before/After Experiment until issues, `AGENTS.md`, and `table.tsv` are updated. Implementing against the current issues would train the agent on a product that v2.9 has replaced.

**Smallest consistent plan:** keep all 30 issues (no new issue, no board/milestone moves). Rewrite the session-token issues in place, especially **repurpose #14** from “missing token / elsewhere notice” into heartbeat + presence resolution. Then update `AGENTS.md` so agents cannot reintroduce tokens.

---

## 1. PRD differences (v2.0 → v2.9)

### 1.1 What stayed the same

- Eight stories: US1–US8 (accounts, password reset, default pet, feeding dashboard, start/complete/give up, history).
- Durations: 15 / 25 / 50 only; no pause; one Active session per account.
- Coins: one per completed minute; coins never reset; coins continue after Full; abandoned sessions earn nothing.
- Apples: 25 feeding minutes = 1 apple; cap 2 apples / 50 feeding minutes per feeding day; leftover minutes carry within the day; midnight reset by saved timezone; credit uses scheduled end, even if resolved later.
- Input limits: email max 254, password 8–15, task max 80 (blank → `"Focus session"`), pet name max 30; reject over-limit, never truncate.
- Password reset: same confirmation for unknown emails; 30-minute single-use links; new request invalidates older links; rate limit per email and IP; `tokenVersion` signs out JWTs.
- Out of scope: shops, spending coins, inventory/manual feeding, pause, custom durations, native apps, social login, avatars, timezone editing, history search, AI, chat, push (except reset email).

### 1.2 Added in v2.9

| Area | Addition |
| --- | --- |
| Glossary (§4) | Session, scheduled end, heartbeat, presence deadline, feeding minutes, feeding day |
| Presence (§5.2) | First heartbeat at start; each tab heartbeats on join and every **10 seconds**; presence deadline = latest accepted heartbeat **+ 30 seconds** |
| Outcome rule (§5.3) | **Completed** only if not abandoned **and** presence deadline is **strictly later** than scheduled end; otherwise **Abandoned** |
| Multi-tab (§5.1, §5.4) | Session belongs to the **account**. Every tab shows the same task/countdown/outcome. Any tab can heartbeat, give up, or complete. Sync via heartbeat responses (~10s); no WebSockets |
| Connection UX | Show a connection warning whenever requests fail |
| Close-all-tabs edge | Closing all tabs **&lt; 30s** before scheduled end can still complete; closing after a valid completion does not revoke rewards |
| Resolution engine | One shared server routine: resolve scheduled end vs expiry **before** applying a later expiry or renewing a heartbeat; resolve on the next request of any kind |
| API | `POST /api/sessions/{id}/heartbeat`; store `lastHeartbeatAt` |
| Client | Keep heartbeats across OnYou navigation; prevent overlapping requests; ignore stale responses |
| Pet name | Default name is **Mochi**; blank rename restores Mochi; optional “Name your pet” on a new-account dashboard |
| Artwork | Reuse mockup SVG art (Starving, Hungry, Full, waiting, slapped); do not generate substitutes |
| Result screen | Show coins **and** feeding minutes **and** apples, including no-apple-yet, already-Full, and minutes discarded by the daily cap |
| History | End-of-list note when every session is loaded; Abandoned shows **“No rewards”** |
| Screens table (§9) | Explicit auth error states, rate-limit UI, reset-link-sent, invalid-link, password-updated notice, dashboard loading/error, active session bar, connection warning, phone bottom sheets |
| Responsive | Desktop 1040px and phone 390px; layout adapts below 600px; 16px input text on phones |
| Nav | Logged-in top nav: **Home**, History, Settings (not “Dashboard”) |
| US2 vs Active session | Reset does **not** abandon an Active session directly, but signing out **stops heartbeats**; the session survives only if the user logs in again and a tab heartbeats **before** the presence deadline |
| Validation (§11) | Explicit multi-tab, presence-boundary, sleep/network, concurrent heartbeat/complete/give-up, and stale-session-before-start cases |

### 1.3 Removed or replaced from v2.0

| v2.0 rule | v2.9 replacement |
| --- | --- |
| Starting tab receives a random **session token** in `sessionStorage` | No completion token. Presence is approximated with heartbeats |
| Only the token-holding tab can complete | **All tabs have equal authority** |
| Other tabs show **“Session running in another tab or closed”** and cannot complete | Other tabs **join** the Active session and show the same timer |
| Closing the starting tab **fails** the session because the token is lost | Closing some tabs is fine if another tab heartbeats. Closing **all** tabs (or 30s with no heartbeat) abandons |
| Sleep / network drop **does not fail** while the starting tab stays open | Sleep / network loss of **≥ 30 seconds with no heartbeat abandons**, even if a tab is still open |
| Opening without the token **after endTime** → Abandoned | Outcome uses **presence deadline vs scheduled end**, not “missing token” |
| Completion requires valid token **and** `now >= endTime` | Completion requires auth/ownership, `now` at/after scheduled end, and presence deadline **strictly after** scheduled end |
| Partner connections called out as a later release in overview/out-of-scope | Partner language dropped from overview; still not in scope |
| Problem statement / primary-user hypothesis section | Shortened; students still implied, less explicit |
| Tech stack table pinning Next.js Route Handlers, Prisma, Neon, `jose`, bcrypt, Zod, Resend, Vitest, CodeQL, Vercel | Stack is **generic**; “specific libraries and hosting belong in the technical specification” |
| “Recommended but not yet confirmed: timezone and input limits” | Timezone-at-signup and input limits are **confirmed** in §§6–7 |
| Example: complete **15 then 10** minutes → 1 apple, 0 partial, 25 coins | Example sequence uses **15 then 15** (1 apple, 5 leftover), a give-up, then 25 (cap discards 5) |

### 1.4 Modified (same story, different rule)

| Topic | v2.0 | v2.9 |
| --- | --- | --- |
| Give up after end | If end time passed, resolve as **completed** | Confirm after scheduled end completes **only if the presence rule was met** |
| Logout during session | Confirm, erase token, abandon | Confirm, abandon **on all tabs and devices**, then log out |
| Nav during active session | AGENTS.md hid most nav except a timer link | Mockup/PRD keep Home/History/Settings **plus** an **active session bar** with Return to session; Start focusing disabled |
| Feeding display | “Partial progress toward the next apple” | “Feeding minutes toward the next apple”; “Full for today” at the cap |
| Default pet name | Unspecified default | **Mochi** |
| Completion rejection | Before end time or without token | Before scheduled end, unauthenticated/wrong user, or already Abandoned |
| Trust model | “Keep the starting tab open” | “Keep **at least one OnYou tab** connected until the scheduled end” |

### 1.5 Structural / documentation changes

- v2.9 points to `OnYou_web_mockups.html` as the layout/copy/art source.
- User stories **refer to §§5–6** instead of restating session/reward rules.
- Mockup intro still says **“PRD v2.8”**; treat v2.9 as the product source of truth and note that one-line mismatch.

---

## 2. Mockup changes

There is no prior HTML mockup in the repo (`docs/mockups/` is specified in `AGENTS.md` but empty). Comparison is against **AGENTS.md §7.2–7.4** and the v2.0 five-screen table.

### 2.1 Main screens (each shown desktop 1040 + phone 390)

**Accounts**

1. Sign up  
2. Sign up with field errors (email in use, password length)  
3. Log in with generic “email or password is incorrect”  
4. Forgot password  
5. Too many reset requests  
6. Reset link sent (does not reveal account existence)  
7. Set new password (hint that saving signs you out everywhere)  
8. New password validation error  
9. Link no longer works  
10. Log in with “Password updated” notice  

**Dashboard / pet**

11. New account, Starving, 0 coins  
12. First visit, optional **Name your pet**  
13. Hungry + partial minutes  
14. Full for today  
15. **Active session bar** on Home (Start focusing disabled: “One session at a time”)  
16. Dashboard loading  
17. Couldn’t load + Try again  

**Focus**

18. Choose task and duration (guidance: keep one tab open; 30-second disconnect rule; Start button names the duration)  
19. Task name too long (Start disabled)  
20. Session running (countdown ring, pet, Give up) — **shown in every open tab**  
21. **Connection warning** banner  
22. Give up confirmation (nothing from this session; earlier progress safe; **ends every tab**)  
23. Session complete (coins, feeding minutes, apples) including cap-discard copy  
24. Complete with **0 apples** (not enough minutes yet)  
25. Complete with pet **already Full** (coins only)  
26. Session ended early (slap; 0/0/0; given up **or** no tab connected for 30 seconds)  

**History / settings**

27. History table (desktop) / cards (phone)  
28. History loading more  
29. History all loaded (end-of-list note)  
30. History empty + Start focusing  
31. Settings: pet name, read-only email, logout hint  
32. Pet name too long  
33. Pet name saved confirmation  
34. Log out during a session (ends on every device, no rewards)  

### 2.2 UI components implied by the mockup

| Component | Role |
| --- | --- |
| Auth split layout | Pet art left / form right on desktop; stacked on phone |
| `AuthForm` + field errors | Email/password, `aria-invalid`, `aria-describedby` |
| Top nav | Home, History, Settings (visible during an active session) |
| `PetCard` | SVG Mochi, name, state label, bowl 0–2 apples |
| `FeedingProgress` | Apples today + “n of 25 min” or “Full for today” |
| Optional name field | First-visit dashboard |
| `ActiveSessionBar` | Task, time left, end time, Return to session |
| `DurationPicker` | 15/25/50 radios; Start *N* minutes |
| `FocusTimer` | Ring + countdown from `endTime` + pet + Give up |
| `ConnectionWarning` | Plum banner when requests fail |
| `GiveUpDialog` | Desktop modal / phone bottom sheet; Give up / Keep focusing |
| `SessionResult` | Three reward tiles: coins, feeding minutes, apples |
| `HistoryList` | Table vs cards; Load more; endnote; “No rewards” |
| Settings groups | Pet name save + account email + logout |
| `LogoutConfirmDialog` | Log out and end session / Stay logged in |
| Loading skeletons | Dashboard |

### 2.3 User flows and interactions

1. Sign up → Home (Starving Mochi, optional name) → Start focusing.  
2. Log in / generic credential error / Forgot password → emailed link → set password → signed out everywhere → “Password updated” on login.  
3. Start session → **all open tabs** show the timer; Home/History/Settings show the session bar; Start focusing disabled.  
4. Heartbeat gap / network failure → connection warning; **≥ 30s** with no heartbeat before scheduled end → abandoned + slap.  
5. Give up from **any** tab → confirm → all tabs show abandoned result.  
6. Complete → result with coins, feeding minutes, apples (including 0 and cap cases) → Back to dashboard or Start another.  
7. History: 20 at a time, Load more, end-of-list, empty CTA.  
8. Logout during Active → confirm → abandon **every device** → login.

### 2.4 Visual / a11y notes that AGENTS.md does not yet match

- Tokens: **pine** (actions), **apple red** (food), **plum** (give up / errors), not generic `primary`/`danger` names only.
- Pet art is **original SVG in code**, including waiting and slapped faces.
- Nav is **not hidden** during a session.
- Phone: dialogs as **bottom sheets**, full-width buttons, duration pet preview **hidden**, inputs **16px**.
- Slap ~0.8s; `prefers-reduced-motion` already in the mockup CSS.

---

## 3. Affected GitHub Issues

Issues `#1`–`#30` were written against **PRD v2.0** (`Source: … scope locked to PRD v2`). None should be edited until this plan is approved. Board columns and milestones stay as they are.

### 3.1 Must change (session model is wrong as written)

| Issue | Current (v2.0) | Required change for v2.9 |
| --- | --- | --- |
| **#5** Prisma schema | FocusSession with implied **token hash**; no heartbeat field | Add `startTime`, `endTime`, `lastHeartbeatAt`, status. **Remove** session-completion `tokenHash`. Keep partial unique index for one ACTIVE session |
| **#11** Rewards domain | Unit test **15 then 10** → 1 apple, 0 partial, 25 coins | Keep coin/apple/cap/timezone rules. **Replace** the canonical example with the v2.9 table (15 → 15 → give up → 25 with 5 minutes discarded). Add a presence/outcome helper **or** leave that in #14 |
| **#12** Start session API | Issues hashed token; 409 on second start | No token. Record **first heartbeat**. Reject a new start while Active. **Resolve a stale Active session first**. Return session state all tabs can use |
| **#13** Focus screen | Token in `sessionStorage`; restore only if token present | **No `sessionStorage` token.** Join Active session on any tab. Countdown from `endTime`. Heartbeat every 10s **across navigation**. Connection warning. Task &gt; 80 disables Start. Copy: keep at least one tab open |
| **#14** Missing token / elsewhere notice | `SessionElsewhereNotice`; abandon after end without token | **Repurpose (do not delete):** heartbeat endpoint + presence-deadline domain + multi-tab join. Remove elsewhere-notice AC. This avoids a 31st issue |
| **#15** Complete API | Requires `X-Session-Token` and `now >= endTime` | Auth + ownership; reject before scheduled end; complete only if presence deadline **&gt;** scheduled end; shared resolution routine; exactly-once rewards; ignore client reward values |
| **#16** Result screen | Coins and feeding credit | Coins **and** feeding minutes **and** apples; copy for no apple yet, already Full, and cap discard; Back to dashboard **and** Start another |
| **#17** Give up | Token tab; complete if end already passed | Any tab; confirmation copy that it ends **every tab**; after scheduled end complete **only if presence was met**; slap + reduced motion; phone bottom sheet |
| **#18** Logout | Erase `sessionStorage` token | Confirm; abandon **on all devices**; no token to erase; Stay logged in cancels |
| **#26** Full-loop E2E | Token/refresh/closed-tab stories | Multi-tab join; give up from a second tab; presence deadline; connection warning; keep fake-timer discipline |
| **#27** OpenAPI | Planned routes without heartbeat | Add `POST /api/sessions/{id}/heartbeat`; drop session-token header from complete |

### 3.2 Should change (AC/copy/UI, not a new subsystem)

| Issue | Gap vs v2.9 / mockup |
| --- | --- |
| **#1** | AC should say AGENTS.md is updated to v2.9 session rules (or a follow-up chore on the same issue) |
| **#7** | Skeleton should list heartbeat, not session-token complete |
| **#8** | Capture **browser timezone at signup** and keep it fixed (now confirmed) |
| **#9** | Split auth layout; generic login error; password-length hint; Home/History/Settings labels |
| **#10** | Default name **Mochi**; blank restores Mochi; optional dashboard name field; reuse mockup SVG |
| **#19** | Response language: feeding minutes toward next apple; “Full for today” |
| **#20** | Nav **Home**; session bar while Active; first-visit name field; original pet art (starving/hungry/full/waiting) |
| **#21** | Still valid (scheduled-end feeding day). Clarify resolution uses presence outcome, not “missing token” |
| **#22** | Abandoned items expose **“No rewards”** (0 coins, 0 feeding minutes) |
| **#23** | Desktop table / phone cards; Load more loading; **end-of-list note** |
| **#24** | Add rate-limit error copy from mockup (“Too many reset requests…”) |
| **#25** | Extra screens: link sent, invalid link, password-updated notice; document heartbeat implication of sign-out (do not abandon in the reset handler) |
| **#28** | Schema diagram must include `lastHeartbeatAt`, not `tokenHash` |
| **#29** | Link to PRD v2.9 + HTML mockup; do not describe the old token model |
| **#30** | 1040/390, &lt;600px layout, 16px inputs, bottom sheets, session bar, Home nav, contrast of pine/plum/apple |

### 3.3 No product-rule change (light source-line edit only)

| Issue | Why it can stay |
| --- | --- |
| **#2** CI | Unchanged |
| **#3** Vercel/Neon | Unchanged (v2.9 moved hosting to the tech spec; we already chose it) |
| **#4** CodeQL / audit / Dependabot | Unchanged |
| **#6** Playwright smoke | Unchanged; avoid encoding the old token flow in the smoke test |

Optional: change the footer line `scope locked to PRD v2` → `PRD v2.9` on every issue for audit trail. That is documentation, not behavior.

### 3.4 Dependencies (recommended smallest reorder)

Keep the 30-issue graph. Only **#14 / #13 / #15** need a dependency fix so heartbeat exists before UI and complete:

| Issue | Current blocked-by | Proposed blocked-by |
| --- | --- | --- |
| #12 | #5, #8 | **unchanged** |
| **#14** (repurposed heartbeat/presence) | #13 | **#12** (and #5 if schema lands in #5) |
| **#13** Focus UI | #12 | **#12, #14** |
| **#15** Complete | #11, #12 | **#11, #12, #14** |
| #17 | #12, #13 | **#12, #13, #14** (needs presence rule for “give up after end”) |
| #18 | #9, #17 | unchanged |
| #26 | #16, #17, #23 | add **#14** if E2E must cover presence |
| #27 | #7, #22, #25 | add **#14** (heartbeat in OpenAPI) |

Do **not** move issues between Sprint 1/2 or board columns for this sync. Heartbeat is Sprint 1 work already covered by #12–#15.

### 3.5 Priorities

Keep current labels except:

| Issue | Current | Proposed | Why |
| --- | --- | --- | --- |
| **#14** | medium | **high** | Presence is now the session invariant; complete/give-up depend on it |
| Others | as today | unchanged | Avoid board churn before the experiment |

### 3.6 Do not create / do not close

- Do **not** open #31 for heartbeat; **rewrite #14**.
- Do **not** close #14; the elsewhere-notice story is obsolete, the slot is still needed.
- Do **not** add partner, shop, or WebSocket issues.

---

## 4. Required AGENTS.md updates (not applied yet)

`AGENTS.md` v2 is internally consistent with **PRD v2.0** and therefore **wrong for v2.9**. Smallest edits, by section:

| Section | Inconsistency | Required update |
| --- | --- | --- |
| **§0** | Points to `docs/PRD.md` (file does not exist) | Point to `OnYou_PRD_v2_9.md` **and** `OnYou_web_mockups.html` (keep older PRD files; do not delete) |
| **§1** | “Keeps the **starting tab** open”; “Giving up, **or closing the tab**” | “Keep **at least one OnYou tab connected**”; abandon on Give up, logout, or **30s without a heartbeat** |
| **§1 out of scope** | Fine | Unchanged; password-reset email remains the only email |
| **§2 stack** | v2.9 defers libraries to a tech spec | **Keep** the pinned stack (Next.js, Prisma, jose, Neon, Vercel, etc.). Record that v2.9 explicitly allows this in the tech spec |
| **§3 tree** | `docs/mockups/` images | Add `OnYou_web_mockups.html`; hooks: `useHeartbeat` / `useActiveSession`, not token restore only |
| **§4** | Prisma example field `tokenHash` | Example `lastHeartbeatAt` |
| **§6 tests** | “closing the tab”, “missing token”, PRD Section 9 | Cover heartbeats, presence deadline vs scheduled end, multi-tab, sleep/network, concurrent heartbeat/complete/give-up (v2.9 §11) |
| **§7.1** | Image mockups; PRD decides behavior | HTML mockup for layout/copy/art; PRD v2.9 for behavior; if they conflict, **PRD wins** and flag it |
| **§7.2** | Hide nav during session; ~480/720 widths | Nav stays; **active session bar**; 1040 / 390 / &lt;600px; pine / apple / plum tokens; SVG Mochi art |
| **§7.3** | `SessionElsewhereNotice` | **Remove.** Add `ActiveSessionBar`, `ConnectionWarning`, heartbeat-aware `FocusTimer`. `SessionResult` shows three reward tiles |
| **§7.4 flows 3–7** | Token save/restore/elsewhere | Join session on every tab; heartbeat 10s; presence 30s; no `sessionStorage` token |
| **§8 Sessions** | Entire token invariant block | Replace with v2.9 §5: `lastHeartbeatAt`, presence deadline, equal-tab authority, shared resolution, no unload events |
| **§8 Rewards** | 15+10 example | v2.9 example table; still inject `now`; never `Date.now()` in domain |
| **§8 Pet name** | “default pet name” | **Mochi** |
| **§9 endpoints** | No heartbeat; complete implies token | Add `POST /api/sessions/{id}/heartbeat`; complete/abandon without `X-Session-Token` |
| **§11 Do/Don’t** | “Keep the session token in `sessionStorage`” | “Send heartbeats every 10s from every open tab”; still **don’t** use `beforeunload` / `localStorage` to decide outcomes |
| **§12 Security** | “Session tokens … stored hashed” | Drop **focus-session** tokens. Keep password-reset hashed tokens and JWT `tokenVersion` |
| **§13** | Still valid | Add Home nav, session bar, bottom-sheet dialogs; keep slap `prefers-reduced-motion` and “Mochi is hungry” alt text |
| **§14 changelog** | Ends at v2 | New row: sync session/heartbeat rules and mockup to PRD v2.9 |

**Do not** weaken TDD, coverage, layering, or “stop and ask.” Those remain correct.

---

## 5. Other repo docs (smallest set)

| File | Action after approval |
| --- | --- |
| `OnYou_PRD v2.md`, `OnYou_PRD.md` | **Keep.** Historical. Do not delete |
| `OnYou_PRD_v2_9.md`, `OnYou_web_mockups.html` | Treat as current sources of truth; optionally copy into `docs/` later without removing originals |
| `table.tsv` | Update rows **12–15** titles (heartbeat, no token, no elsewhere notice) so planning matches GitHub |
| `HW3_Scrum_Setup_Report.md` | Leave as the record of the **v2.0 board**; do not rewrite history |
| Application code | None yet |

---

## 6. Impact on the Before/After Experiment

**Do not start the experiment on the current issue text.**

| Risk | Why it matters |
| --- | --- |
| Agent implements the **wrong session product** | #12–#15 still require `sessionStorage` tokens and `SessionElsewhereNotice`. That contradicts v2.9 and the mockup |
| After-prompt “fix the PRD” would confound the study | If issues/AGENTS.md stay on v2.0, the experiment measures v2.0, not v2.9 |
| Changing issues **during** the experiment | Would mix two requirement sets in one trial |
| Coverage/TDD still valid | Keep red→green; rewrite AC first so failing tests match presence rules |
| Extra scope vs original 30-issue estimate | Heartbeat + multi-tab tests add work **inside** Sprint 1 session issues, not a new sprint. #14 becomes larger; #13/#15 shift rather than grow unbounded |
| Hosting/stack | Low impact. Continue with the AGENTS.md stack; v2.9 allows a separate tech spec |
| UI experiment tasks (#9, #16, #20, #23) | Mockup is now precise enough that “after” prompts can cite screen names; update those AC so graders are not marking token copy |

**Suggested experiment gate:** issues #5, #11–#18, #14, AGENTS.md §§1, 7–9, 11–12, and `table.tsv` session rows updated and approved → **then** start Before/After.

---

## 7. Update plan for approval (not executed)

No GitHub Issues, board, milestones, or `AGENTS.md` have been changed.

### Phase A — Documentation only (this report’s follow-up)

1. Keep all previous PRD files.  
2. After approval, update `AGENTS.md` as in §4 (one PR/chore, issue **#1** or a docs note on #1).  
3. Align `table.tsv` session row titles with v2.9.  
4. Optionally place copies under `docs/` without deleting root files.

### Phase B — Issue text only (still no board moves)

1. Rewrite **#5, #11, #12, #13, #14, #15, #16, #17, #18** acceptance criteria and summaries.  
2. Repurpose **#14** to heartbeat + presence; retitle; set priority **high**; set blocked-by **#12**.  
3. Point **#13** and **#15** (and #17) at **#14**.  
4. Patch UI/docs issues **#7, #9, #10, #19, #20, #22–#30** with mockup AC.  
5. One-line source update on remaining issues: PRD v2.9.  
6. Do **not** create/close issues. Do **not** move Sprint 1/2 or Status.

### Phase C — After that, and only after that

- Start the HW3 Before/After Experiment against the **updated** issues.

### Explicit non-actions (confirmed)

- Do not modify GitHub Issues yet  
- Do not modify the Project Board or milestones  
- Do not modify `AGENTS.md` yet  
- Do not implement application features  
- Do not delete previous PRD versions  
- Do not start the Before/After Experiment  

---

## 8. Open questions (stop rather than invent)

v2.9 is complete enough to implement session/reward behavior. Only these need a partner check if they come up in implementation:

1. Mockup header says **PRD v2.8**; product file is **v2.9**. Assume v2.9 wins.  
2. Heartbeat interval **10s** and grace **30s** are exact constants — encode as named constants, not magic numbers.  
3. v2.9 no longer pins Prisma/jose/Vercel; **keep AGENTS.md pins** unless Team Member A objects.  
4. Password reset signs the user out; Active session is **not** abandoned in the reset handler. Presence may abandon it later. Confirm that split stays in #25 vs #18.

---

## 9. Conclusion

PRD v2.9 is not a cosmetic refresh. It **replaces tab-token completion with heartbeat presence** and **makes every tab first-class**. The 30-issue plan can stay at 30 items if **#14 is rewritten** and session issues **#5, #12–#18** plus `AGENTS.md` domain/API/UI rules are updated. Until that happens, the Scrum board still describes PRD v2.0.

**Waiting on approval** to apply Phase A/B. Nothing in GitHub or `AGENTS.md` has been changed.
