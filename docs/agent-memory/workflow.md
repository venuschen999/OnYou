# Workflow decisions

Branching, PRs, and repo process. `AGENTS.md` §10.

## W1. Retarget stacked PRs to `main` before merging

- **Decision:** Before merging a PR stacked on another branch, check that its base is `main`. After the lower PR merges, retarget the stacked one with `gh pr edit <n> --base main`.
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Why:** PR #32 (#5, Prisma schema) was stacked on `chore/1-scaffold-nextjs`. It merged into that branch after #31 had already reached `main`, so `main` never got the schema. PR #33 re-landed the same three commits on `main`.
- **Applies to:** Every stacked PR.
- **Status:** Decided.

## W2. Do not export `runtime` from Route Handlers

- **Decision:** Route Handlers rely on Next.js's default Node.js runtime and do not export `runtime = "nodejs"`. A comment explains why instead.
- **Date / decided by:** 2026-11-03, found during #8 (`npm run build` failed).
- **Why:** `next.config.ts` enables `cacheComponents`, and Next.js 16 rejects any `runtime` segment config with it. Unit and integration tests import handlers directly, so only `npm run build` catches this; run it before opening a PR.
- **Applies to:** Every `src/app/api/**/route.ts`.
- **Status:** Decided.

## W3. #9 is stacked on #8

- **Decision:** `feature/9-auth-screens` branches from `feature/8-auth-signup-login`. Its PR targets `feature/8-auth-signup-login` until #35 merges, then is retargeted to `main` (W1).
- **Date / decided by:** 2026-11-03, Partner A (`venuschen999`).
- **Status:** Decided.

## W4. Prisma 7 migrations use the direct Neon URL

- **Decision:** `prisma migrate deploy` reads `DATABASE_URL_UNPOOLED` when that name is set, and `DATABASE_URL` otherwise. The running app keeps using pooled `DATABASE_URL` through the `pg` adapter. `schema.prisma` stays without `url` or `directUrl`. Vercel builds with `vercel-build` (`prisma migrate deploy && next build`). Preview and Production use different Neon branches.
- **Date / decided by:** 2026-11-10, Partner B (`CollinsCao`), during #3.
- **Why:** Prisma 7.10 `Datasource` accepts `url` and `shadowDatabaseUrl`. A `directUrl` field in `schema.prisma` is not part of that config. Neon supplies `DATABASE_URL` for the pooled app connection and `DATABASE_URL_UNPOOLED` for migrations. Draft PR #39 targeted the older schema shape. The Vercel project is `onyou123` on Venus's account.
- **Applies to:** `prisma.config.ts`, `src/lib/server/migrationDatabaseUrl.ts`, `.env.example`, `package.json` `vercel-build`, `docs/deployment.md`.
- **Status:** Decided.

## W5. Venus owns the Vercel project and its Neon database

- **Decision:** #3 moved to Partner A. The Neon database is created through the Vercel Storage integration on the `onyou123` project, with the variable prefix `DATABASE` and a Neon branch per preview deployment. Collins' Neon project `onyou` is not used.
- **Date / decided by:** 2026-11-14, Partner A (`venuschen999`).
- **Why:** The Vercel Hobby plan allows one member, so one account owns the project. Keeping the database in the same account means Vercel sets the connection variables, and no connection strings are passed between partners.
- **Applies to:** #3, `docs/deployment.md`. Supersedes the account detail in W4; the migration rule in W4 stands.
- **Status:** Decided.
