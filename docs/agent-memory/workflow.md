# Workflow decisions

Branching, PRs, and repo process. `AGENTS.md` §10.

## W1. Retarget stacked PRs to `main` before merging

- **Decision:** Before merging a PR stacked on another branch, check that its base is `main`. After the lower PR merges, retarget the stacked one with `gh pr edit <n> --base main`.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** PR #32 (#5, Prisma schema) was stacked on `chore/1-scaffold-nextjs`. It merged into that branch after #31 had already reached `main`, so `main` never got the schema. PR #33 re-landed the same three commits on `main`.
- **Applies to:** Every stacked PR.
- **Status:** Decided.
