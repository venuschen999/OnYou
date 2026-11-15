# Vercel and Neon

Issue #3. The GitHub repository is `venuschen999/OnYou`. The Vercel project is `onyou123`. The project name does not have to match the repository name. Connect that existing project to this repository. Do not create a second Vercel project.

Production deployments come from `main`. Pull requests get preview deployments. Preview and production use separate Neon branches.

## Environment names

Values live in Vercel environment settings. `.env.example` lists names only.

| Name | Preview | Production | Local / CI | Purpose |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | required | required | app and unit checks | Pooled Neon URL for the running app (`src/lib/server/db.ts`) |
| `DATABASE_URL_UNPOOLED` | required | required | unset when `DATABASE_URL` is already direct | Direct Neon URL for `prisma migrate deploy` |
| `JWT_SECRET` | required, unique | required, unique | tests set their own | JWT signing. Preview and Production use different values |
| `TEST_DATABASE_URL` | unset | unset | required for integration tests | Isolated PostgreSQL 16 database. Never a Neon URL |
| `SHADOW_DATABASE_URL` | unset | unset | optional, `prisma migrate dev` only | Prisma drift checks |

The Vercel Neon integration sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` (custom prefix `DATABASE`) for Production and Preview. Production uses the Neon main branch. "Create database branch for deployment" is on for Preview only, so each preview deployment gets its own Neon branch and never touches production data. The integration also adds other `DATABASE_*` names (`DATABASE_PGHOST`, `DATABASE_POSTGRES_PRISMA_URL`, and so on). The app does not read them.

## Prisma 7

`prisma/schema.prisma` does not store a connection URL. Prisma 7 reads it from `prisma.config.ts`. That file calls `migrationDatabaseUrl`:

- `DATABASE_URL_UNPOOLED` when it is non-blank, so migrations use the direct Neon host.
- Otherwise `DATABASE_URL`, which is what local PostgreSQL and CI already provide.

The app uses `@prisma/adapter-pg` with `DATABASE_URL`. Runtime traffic stays on the pooled connection. `schema.prisma` has no `url` or `directUrl`. Prisma 7.10 reads the migration URL from `prisma.config.ts`.

Node.js is 22 (`package.json` `engines`). Vercel installs devDependencies, including the Prisma CLI.

## Migrations

Committed files in `prisma/migrations` are the schema. Vercel runs `npm run vercel-build`, which is `prisma migrate deploy && next build`, because a `vercel-build` script replaces the default build. `migrate deploy` applies pending committed migrations to the database for that deployment. It does not create migrations and it does not use the shadow database.

Leave the Vercel build command at the framework default, or set it to `npm run vercel-build`. A dashboard override of `next build` skips migrations.

`npm run build` stays `next build` so a local production build does not migrate a database.

Apply migrations to production by deploying `main` after this configuration is in place. Do not run `prisma migrate deploy` or `prisma migrate dev` against production Neon from a laptop.

Integration tests set both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to `TEST_DATABASE_URL` before `migrate deploy`, so a local `.env` cannot redirect those tests.

## Accounts

The Vercel project `onyou123` and its Neon database are on Venus's Vercel account (Hobby and Neon Free plans). The database was created from the project's Storage tab, so Vercel manages its connection variables. The project connects to `venuschen999/OnYou`. Do not create a second Vercel project or Neon database.

An earlier Neon project `onyou` in Collins' Neon organization is not used. A GitHub repository `venuschen999/onyou123`, created by the first Vercel import, is a copy and is not connected.

## Handoff checklist

Repository preparation is on `feature/3-vercel-neon-deployment`. Every item except the production deployment was verified on 2026-11-14 with PR #54's preview, where signup reached Home. Completing them does not include running a production migration from a laptop. `prisma migrate deploy` runs only as part of a Vercel build for the environment being deployed.

- [x] Verify Vercel `onyou123` connects to `venuschen999/OnYou`.
- [x] Confirm the production branch is `main`.
- [x] Create the Neon database through the Vercel Storage integration, with a database branch per preview deployment.
- [x] Configure `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) for Preview and Production through that integration.
- [x] Configure `JWT_SECRET` separately for Preview and Production.
- [x] Verify Prisma migrations by a Vercel build that runs `npm run vercel-build` against the preview database.
- [x] Verify a Preview Deployment for a pull request.
- [ ] Verify a Production Deployment from `main` after the preview succeeds.

Leave `TEST_DATABASE_URL` and `SHADOW_DATABASE_URL` unset on Vercel. Store values in Vercel environment settings only. `.env.example` keeps the names, with no values.
