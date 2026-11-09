# Agent memory

Product and technical decisions the team made while working with coding agents, filed by feature. They fill gaps where `OnYou_PRD_v2_9.md` and `AGENTS.md` are silent.

**Precedence:** PRD v2.9 and `AGENTS.md` win. If a decision here conflicts with them, stop and ask; then update the losing document.

## Files

| File | Feature area | Issues |
| --- | --- | --- |
| [auth.md](auth.md) | Signup, login, JWT cookie, timezone capture | #8, #9 |
| [pet.md](pet.md) | Default pet (Mochi) creation and naming | #8, #10 |
| [workflow.md](workflow.md) | Branching, PRs, and repo process | — |

## Entry format

Each decision is one entry:

- **Decision:** what was decided, stated so it can be tested.
- **Date / decided by:** absolute date and partner.
- **Why:** the reason, so edge cases can be judged later.
- **Applies to:** issues, files, or constants affected.
- **Status:** `Decided`, `Open` (question still pending), or `Superseded by …`.

Add an entry in the PR where the decision was made. Do not delete superseded entries; mark them.
