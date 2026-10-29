# HW3 Scrum Setup Report — OnYou

**Team Member B:** CollinsCao  
**Date:** 2026-10-28  
**Scope source:** Approved sprint planning (`table.tsv`) + PRD Version 2  
**Application code modified:** None

---

## Summary

GitHub Scrum workflow for OnYou is configured: Project Board, two milestones, labels, and all 30 planned issues with acceptance criteria, assignees, milestones, priorities, and dependency links. Live state was verified via GitHub CLI / APIs.

| Item | Result |
| --- | --- |
| Repository | https://github.com/venuschen999/OnYou |
| GitHub Project | https://github.com/users/CollinsCao/projects/3 |
| Project visibility | **Public** (repo owner can view without a private invite) |
| Issues created | **30** |
| Sprint 1 milestone issues | **18** |
| Sprint 2 milestone issues | **12** |
| Sprint Todo (board) | **18** |
| Backlog (board) | **12** |
| Milestone due dates | **Confirmed** — Sprint 1: Nov 2, 2026; Sprint 2: Nov 11, 2026 |

---

## 1. Access verification

| Check | Result |
| --- | --- |
| Authenticated account | `CollinsCao` |
| Token scopes used | `repo`, `project`, `workflow`, `read:org`, `gist` |
| Repository permission | `WRITE` on `venuschen999/OnYou` |
| Collaborators | `venuschen999` (admin), `CollinsCao` (write) |

No authentication tokens are included in this report.

---

## 2. GitHub Project Board

| Field | Value |
| --- | --- |
| Name | OnYou — Agile Development |
| URL | https://github.com/users/CollinsCao/projects/3 |
| Owner | `CollinsCao` (Team Member B) |
| Visibility | Public |
| Short description | Scrum board for OnYou MVP (PRD v2). Sprint dates confirmed by the team. |
| Board view | `Board` (`BOARD_LAYOUT`) |

### Status columns (exact)

1. Backlog  
2. Sprint Todo  
3. In Progress  
4. In Review  
5. Done  

### Repository linkage

**Unresolved limitation:** GitHub Projects (v2) only allows formal `linkProjectV2ToRepository` when the project owner matches the repository owner. Because the project is owned by `CollinsCao` and the repo by `venuschen999`, the API rejected the link:

> Only projects owned by the same owner as the repository can be linked.

**Mitigations applied:**

- Project is **public**, so `venuschen999` can open and use the board URL.
- Collaborator role **WRITER** was granted to `venuschen999` via `updateProjectV2Collaborators`.
- All 30 OnYou issues were added as project items (board is fully populated even without a formal repo link).

**Optional follow-up for Team Member A:** recreate or transfer the project under `venuschen999` if a formal repo↔project link is required for the assignment rubric.

---

## 3. Milestones

Team-agreed sprint schedule (updated on existing milestones; no duplicates created):

| Milestone | URL | Start date | Due date (API `due_on`) | Issues | Open issues |
| --- | --- | --- | --- | --- | ---: |
| Sprint 1 | https://github.com/venuschen999/OnYou/milestone/1 | October 24, 2026 | November 2, 2026 (`2026-11-02T00:00:00Z`) | #1–18 | 18 |
| Sprint 2 | https://github.com/venuschen999/OnYou/milestone/2 | November 3, 2026 | November 11, 2026 (`2026-11-11T00:00:00Z`) | #19–30 | 12 |

Milestone descriptions include the agreed start date, due date, and issue range. GitHub stores milestone due dates as midnight UTC on the selected calendar day.

---

## 4. Labels

Created (or confirmed present) for Scrum use:

| Label | Purpose |
| --- | --- |
| `feature` | Product capability work |
| `chore` | Setup / tooling / polish |
| `docs` | Documentation |
| `test` | Testing work |
| `priority:high` | High priority |
| `priority:medium` | Medium priority |
| `priority:low` | Low priority |
| `accessibility` | Used on polish issue #30 |

Default GitHub labels (`bug`, `enhancement`, etc.) remain unused for this planning set.

---

## 5. Issues created

All **30** planning rows from `table.tsv` were created as GitHub issues `#1`–`#30`.  
Planning ID equals GitHub issue number for this repository (clean 1:1 mapping).

Each issue includes:

- Planning ID, story/area, sprint, owner  
- Concise summary  
- Measurable acceptance criteria as Markdown checkboxes (`- [ ]`)  
- Dependency section using **real GitHub issue numbers**  
- Correct milestone, type + priority labels, and assignee  

### Assignees

| Owner | GitHub user | Issue count |
| --- | --- | --- |
| A | `venuschen999` | 15 |
| B | `CollinsCao` | 15 |

### Priority assignments (approved scheme)

| Priority | Planning / issue IDs |
| --- | --- |
| high | 1, 2, 5, 8, 11, 12, 15, 19, 22, 24 |
| medium | 3, 4, 6, 7, 9, 10, 13, 14, 16, 17, 18, 20, 21, 23, 25, 26, 30 |
| low | 27, 28, 29 |

---

## 6. Issue dependency mapping

Dependencies preserved from `table.tsv`, recorded with GitHub issue numbers:

| Issue | Depends on |
| --- | ---: |
| #1 | — |
| #2 | #1 |
| #3 | #1 |
| #4 | #2 |
| #5 | #1 |
| #6 | #2, #3 |
| #7 | #1 |
| #8 | #5 |
| #9 | #8 |
| #10 | #8 |
| #11 | #5 |
| #12 | #5, #8 |
| #13 | #12 |
| #14 | #13 |
| #15 | #11, #12 |
| #16 | #15 |
| #17 | #12, #13 |
| #18 | #9, #17 |
| #19 | #11, #15 |
| #20 | #19 |
| #21 | #11, #15 |
| #22 | #15, #17 |
| #23 | #22 |
| #24 | #8 |
| #25 | #24 |
| #26 | #16, #17, #23 |
| #27 | #7, #22, #25 |
| #28 | #5 |
| #29 | #3 |
| #30 | #20, #23 |

---

## 7. Project board status configuration

| Board status | Issues | Rule |
| --- | ---: | --- |
| Sprint Todo | 18 | All Sprint 1 issues (#1–#18) |
| Backlog | 12 | All Sprint 2 issues (#19–#30) |
| In Progress | 0 | Ready for use |
| In Review | 0 | Ready for use |
| Done | 0 | Ready for use |

---

## 8. Validation results (live API)

Verified after setup:

| Check | Pass? |
| --- | --- |
| Project exists at reported URL | Yes |
| Five Status options exact match | Yes |
| Board view layout is `BOARD_LAYOUT` | Yes |
| Both milestones exist | Yes |
| Exactly 30 issues exist | Yes |
| Every issue has acceptance-criteria checkboxes | Yes (4–5 each) |
| Every issue has labels | Yes |
| Every issue has correct milestone | Yes |
| Every issue has assignee | Yes |
| Sprint 1 → Sprint Todo | Yes (18) |
| Sprint 2 → Backlog | Yes (12) |
| Dependencies use GitHub issue numbers | Yes |
| Formal project↔repository link | **No** (owner mismatch — see §2) |
| Milestone due dates set | **Yes** (Sprint 1: 2026-11-02; Sprint 2: 2026-11-11) |

---

## 9. Unresolved / follow-up items

1. **Formal project–repo link:** Requires the project to be owned by `venuschen999` (or an org that owns the repo). Current public project + WRITER collaborator + populated board are the workaround.
2. **Partner confirmation:** Team Member A (`venuschen999`) should confirm they can open https://github.com/users/CollinsCao/projects/3 and edit board status.

Sprint due dates were confirmed by the team and applied to the existing milestones (see §3).

---

## 10. Artifact note

Helper mapping files used during setup (not application code):

- `.scrum-setup/planning_to_github.json`
- `.scrum-setup/project_items.json`
- `.scrum-setup/create_issues.py`
- `.scrum-setup/wire_project.py`

These can be kept for audit or deleted; they are not required at runtime.

---

## 11. Conclusion

Scrum setup for HW3 is complete against the approved plan and PRD v2 scope: **30 issues**, **2 milestones with confirmed dates** (Sprint 1 due Nov 2, 2026; Sprint 2 due Nov 11, 2026), **labeled/assigned/prioritized work**, and a **5-column Agile board** with Sprint 1 in **Sprint Todo** and Sprint 2 in **Backlog**. Remaining open item is optional transfer of project ownership for a formal repository link.
