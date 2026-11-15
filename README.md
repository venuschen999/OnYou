# OnYou

OnYou is a web app that turns focus time into care for a virtual pet. Every account starts with a pet named Mochi. The user names a task, chooses 15, 25, or 50 minutes, and keeps at least one signed-in OnYou tab connected until the scheduled end. A completed session earns coins and feeding progress. Giving up, logging out during an Active session, or going 30 seconds or more without a heartbeat earns nothing.

A focus session belongs to the account, not to a browser tab. Every signed-in tab shows the same task, countdown, and outcome. Any tab of that account can send heartbeats, give up, or request completion. Presence is an authenticated HTTP heartbeat every 10 seconds.

Product behavior is specified in [OnYou_PRD_v2_9.md](OnYou_PRD_v2_9.md). Layout, copy, and pet art are in [OnYou_web_mockups.html](OnYou_web_mockups.html).

## Project overview

### What OnYou does

Students use OnYou for self-directed study or work. Completing a focus session feeds Mochi and adds coins. The pet’s day has three feeding states, shown on screen as Starving, Hungry, and Full. Coins accumulate and do not reset. Apples and feeding minutes reset at midnight in the timezone saved at signup.

### Core MVP features

- Account signup, login, and logout.
- Password reset by email.
- A default pet named Mochi, with optional renaming.
- Focus sessions of 15, 25, or 50 minutes, with one Active session per account.
- Heartbeat presence across tabs. The server decides Completed or Abandoned from stored timestamps.
- Coins and automatic feeding rewards, applied once.
- Daily feeding progress.
- Paginated session history.

Spending coins, shops, pause and resume, custom durations, and social login are out of scope.

### Technology stack

Versions and architecture rules are in [AGENTS.md](AGENTS.md). The versions installed in this repository are:

| Area | Technology |
| --- | --- |
| Runtime | Node.js 22, TypeScript 5 |
| App | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Data | PostgreSQL 16, Prisma 7 with `@prisma/adapter-pg` |
| Auth and validation | `jose` (JWT in an HttpOnly cookie), `bcrypt`, Zod 4 |
| Tests | Vitest 5 |
| API docs | OpenAPI 3.1 and Swagger UI |
| Hosting | Vercel for the app, Neon for PostgreSQL |

## Prerequisites

- Node.js 22. [`.nvmrc`](.nvmrc) pins `22`, and `package.json` `engines` requires `>=22 <23`.
- npm (included with Node.js).
- PostgreSQL 16.
- Git.

## Local setup

Commands below match this repository: `package-lock.json` is committed, `npm ci` is what CI runs, and `postinstall` runs `prisma generate`.

1. Clone the repository and enter it.

   ```bash
   git clone https://github.com/venuschen999/OnYou.git
   cd OnYou
   ```

2. Install dependencies.

   ```bash
   npm ci
   ```

3. Create a local env file from the name-only template.

   ```bash
   cp .env.example .env
   ```

   Fill in the values in `.env`. Do not commit that file. Names and purposes are listed under [Environment variables](#environment-variables).

4. Create three PostgreSQL 16 databases: one for the app, one for integration tests, and one shadow database for `prisma migrate dev`.

   ```bash
   createdb onyou
   createdb onyou_test
   createdb onyou_shadow
   ```

   Point the URLs in `.env` at those databases. A local PostgreSQL server that does not need a password can use:

   ```text
   DATABASE_URL=postgresql://localhost:5432/onyou
   DATABASE_URL_UNPOOLED=
   SHADOW_DATABASE_URL=postgresql://localhost:5432/onyou_shadow
   TEST_DATABASE_URL=postgresql://localhost:5432/onyou_test
   ```

   If the server requires a role and password, put them in the URL (`postgresql://USER:PASSWORD@localhost:5432/onyou`) and use the same shape for the test and shadow URLs. Leave `DATABASE_URL_UNPOOLED` empty on a local server. That variable is the direct Neon host used by deployments. Local PostgreSQL is already a direct connection, so Prisma uses `DATABASE_URL`.

   Set `JWT_SECRET` to a unique local value of at least 32 characters. The app rejects a shorter secret when it signs a token.

5. Apply the committed migrations to the app database.

   ```bash
   npx prisma migrate deploy
   ```

   Prisma 7 reads the URL from `prisma.config.ts`, which uses `DATABASE_URL_UNPOOLED` when it is non-blank and otherwise `DATABASE_URL`. `migrate deploy` applies the SQL already committed in `prisma/migrations`.

   Use `npx prisma migrate dev` only when you are creating a new migration. That command needs `SHADOW_DATABASE_URL`.

6. Start the development server.

   ```bash
   npm run dev
   ```

   The app is served at [http://localhost:3000](http://localhost:3000). API documentation is at [http://localhost:3000/docs](http://localhost:3000/docs).

`npm run test:integration` applies migrations to `TEST_DATABASE_URL` before the tests run.

## Environment variables

[`.env.example`](.env.example) lists every name and no values. Keep real values in `.env` locally and in Vercel environment settings for Preview and Production. Never commit secrets, passwords, reset tokens, or JWTs.

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled connection for the running app (`src/lib/server/db.ts`). On a local PostgreSQL server this is the direct URL. |
| `DATABASE_URL_UNPOOLED` | Direct Neon host for `prisma migrate deploy`. Leave unset locally when `DATABASE_URL` is already direct. |
| `SHADOW_DATABASE_URL` | Shadow database for local `prisma migrate dev` drift checks. Not used by `migrate deploy` or by Vercel. |
| `TEST_DATABASE_URL` | Isolated PostgreSQL 16 database for integration tests. Never a Neon URL. |
| `JWT_SECRET` | Signs the auth cookie. At least 32 characters. Preview and Production use different values. |

Preview and Production on Vercel receive `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `JWT_SECRET`. Leave `TEST_DATABASE_URL` and `SHADOW_DATABASE_URL` unset there. The Neon integration may add other `DATABASE_*` names. The app does not read them.

## Development scripts

Scripts from `package.json`:

| Script | Command | What it does |
| --- | --- | --- |
| `npm run dev` | `next dev` | Development server |
| `npm run build` | `next build` | Production build of the app. Leaves the database unchanged |
| `npm run start` | `next start` | Serves the production build |
| `npm run vercel-build` | `prisma migrate deploy && next build` | Vercel build. Applies committed migrations, then builds |
| `npm run lint` | `eslint` | Lint |
| `npm run typecheck` | `next typegen && tsc --noEmit` | Typecheck |
| `npm run format` | `prettier --write .` | Format files Prettier is allowed to change |
| `npm run format:check` | `prettier --check .` | Check formatting |
| `npm test` | `vitest run --config vitest.config.ts` | Unit tests |
| `npm run test:integration` | requires `TEST_DATABASE_URL`, then Vitest | Integration tests against PostgreSQL 16 |
| `npm run test:coverage` | `node scripts/run-coverage.mjs` | Coverage. Overall lines at least 80%. `src/lib/domain/` lines and branches at least 95% when that folder has runtime source |
| `postinstall` | `prisma generate` | Generates the Prisma client after `npm ci` |

`npm run test:integration` exits immediately when `TEST_DATABASE_URL` is missing. CI sets that variable to a PostgreSQL 16 service and also sets `DATABASE_URL` for the job. The test setup then points both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` at `TEST_DATABASE_URL`, so a developer `.env` cannot send those tests to Neon.

## Deployment

The app runs on Vercel. PostgreSQL runs on Neon. The GitHub repository is `venuschen999/OnYou`. The Vercel project is `onyou123`, connected to that repository. Do not create a second Vercel project. Detailed steps, the environment table, and the handoff checklist are in [docs/deployment.md](docs/deployment.md).

### Preview and Production

Production deployments come from `main`. Every other branch, including pull requests, gets a preview deployment.

Preview and Production use separate Neon branches. The database was created from the Vercel project’s Storage tab with the custom prefix `DATABASE`, so Vercel sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) for each environment. Preview has “create a database branch for each deployment” enabled, so a preview never writes to production data. Production uses the Neon main branch. `JWT_SECRET` is set separately for Preview and Production.

### Environment separation

| | Local | Preview | Production |
| --- | --- | --- | --- |
| App database | Your PostgreSQL 16 database (`DATABASE_URL`) | Neon branch for that preview | Neon main branch |
| Migrations | `npx prisma migrate deploy` against the local app database | `npm run vercel-build` during the preview build | `npm run vercel-build` during the production build |
| Integration tests | `TEST_DATABASE_URL` only | unset | unset |
| `JWT_SECRET` | local value in `.env` | unique Preview value | unique Production value |

### Migration workflow

Committed SQL in `prisma/migrations` is the schema. `prisma/schema.prisma` does not store a connection URL. Prisma 7 reads it from `prisma.config.ts`.

Vercel runs `npm run vercel-build`, which is `prisma migrate deploy && next build`. `migrate deploy` applies pending committed migrations to the database for that deployment. It does not create migrations and it does not use the shadow database.

`npm run build` stays `next build`, so a local production build does not migrate a database. Do not run `prisma migrate deploy` or `prisma migrate dev` against production Neon from a laptop. Production migrations run only as part of the Vercel build for `main`.

Leave the Vercel build command at the framework default, or set it to `npm run vercel-build`. A dashboard override of `next build` skips migrations.

## Project documentation

| Document | What it is |
| --- | --- |
| [AGENTS.md](AGENTS.md#3-architecture) | Engineering rules, architecture, and workflow. Folder layout and dependency direction are in that section. The repository does not include a separate diagram file. |
| [OnYou_PRD_v2_9.md](OnYou_PRD_v2_9.md) | Product requirements |
| [OnYou_web_mockups.html](OnYou_web_mockups.html) | Screen layout, copy, and pet art |
| [docs/openapi.yaml](docs/openapi.yaml) | OpenAPI 3.1 specification. Swagger UI is served at `/docs` |
| [docs/deployment.md](docs/deployment.md) | Vercel and Neon setup, environments, and migrations |

Older PRDs and rules live under `docs/archive/` and are not current instructions. Homework 3 reports are in [docs/hw3/](docs/hw3/), including [the Scrum setup report](docs/hw3/HW3_Scrum_Setup_Report.md), [the before/after results](docs/hw3/HW3_Before_After_Results.md), and [the rules refinement report](docs/hw3/HW3_Rules_Refinement_Report.md).
