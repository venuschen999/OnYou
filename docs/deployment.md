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

`DATABASE_URL` on Preview and `DATABASE_URL` on Production point at different Neon branches. The same split applies to `DATABASE_URL_UNPOOLED`. The Neon integration should create one database branch per preview deployment. Production stays on the Neon production branch.

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

## Dashboard steps still required

Linking `onyou123` to `venuschen999/OnYou`, choosing `main` as the production branch, enabling preview deployments, creating the Neon project, and saving the environment values are Vercel and Neon account actions. This repository documents and prepares those steps. Merging it does not by itself prove a deployment succeeded.
