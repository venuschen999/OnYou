# Setup and deployment guide

This guide takes you from a fresh clone to a running local copy of OnYou, through every test suite, and on to the Vercel deployment with its Neon database and Resend email. Production is <https://onyou123.vercel.app>, deployed automatically from `main`.

- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Running and testing](#running-and-testing)
- [How deployment works](#how-deployment-works)
- [First-time deployment setup](#first-time-deployment-setup)
- [Day-to-day workflow](#day-to-day-workflow)
- [Database migrations](#database-migrations)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Local setup

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22 | [`.nvmrc`](../.nvmrc) pins `22`; `package.json` `engines` requires `>=22 <23` |
| npm | comes with Node.js | `package-lock.json` is committed; use `npm ci` |
| PostgreSQL | 16 | a local server, or Docker (below) |
| Git | any recent | |

### Steps

1. **Clone and install.** `postinstall` runs `prisma generate`, so the Prisma client is ready after install.

   ```bash
   git clone https://github.com/venuschen999/OnYou.git
   cd OnYou
   npm ci
   ```

2. **Start PostgreSQL 16.** If you have Docker, one container is enough:

   ```bash
   docker run --name onyou-postgres -e POSTGRES_PASSWORD=onyou \
     -p 5432:5432 -d postgres:16
   ```

   Later, `docker start onyou-postgres` brings it back after a restart.

3. **Create three databases:** the app database, an isolated one for integration tests, and a shadow database for `prisma migrate dev`.

   ```bash
   # Docker
   for db in onyou onyou_test onyou_shadow; do
     docker exec onyou-postgres createdb -U postgres "$db"
   done

   # or a local PostgreSQL server
   createdb onyou && createdb onyou_test && createdb onyou_shadow
   ```

4. **Create `.env`** from the names-only template and fill in the values. Never commit `.env`.

   ```bash
   cp .env.example .env
   ```

   For the Docker setup above:

   ```text
   DATABASE_URL=postgresql://postgres:onyou@localhost:5432/onyou
   DATABASE_URL_UNPOOLED=
   SHADOW_DATABASE_URL=postgresql://postgres:onyou@localhost:5432/onyou_shadow
   TEST_DATABASE_URL=postgresql://postgres:onyou@localhost:5432/onyou_test
   JWT_SECRET=<run: openssl rand -base64 32>
   RESEND_API_KEY=
   RESEND_FROM_EMAIL=
   APP_URL=http://localhost:3000
   ```

   Leave `DATABASE_URL_UNPOOLED` empty locally: a local server is already a direct connection. The Resend values can stay empty; password reset still works, it just logs that the email was not sent.

5. **Apply the migrations** to the app database.

   ```bash
   npx prisma migrate deploy
   ```

6. **Run the app.**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>, sign up, and you land on Home with Mochi. The API docs (Swagger UI) are at <http://localhost:3000/docs>.

## Environment variables

[`.env.example`](../.env.example) lists every name with no values. Real values live in `.env` locally and in the Vercel project's environment settings.

| Name | Local | Vercel Preview | Vercel Production | Purpose |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | required | set by the Neon integration | set by the Neon integration | Pooled connection the app uses (`src/lib/server/db.ts`). The app fails at startup without it |
| `DATABASE_URL_UNPOOLED` | empty | set by the Neon integration | set by the Neon integration | Direct Neon connection for `prisma migrate deploy` (`prisma.config.ts` prefers it when set) |
| `JWT_SECRET` | required, 32+ characters | required, its own value | required, its own value | Signs the auth cookie. Preview and Production must differ |
| `RESEND_API_KEY` | optional | set (Secret) | set (Secret) | Sends password-reset email through Resend |
| `RESEND_FROM_EMAIL` | optional | set | set | Sender, e.g. `OnYou <onboarding@resend.dev>` |
| `APP_URL` | `http://localhost:3000` | leave unset | `https://onyou123.vercel.app` | Base of reset links. Previews fall back to Vercel's automatic `VERCEL_URL`. Never taken from the request `Host` header |
| `TEST_DATABASE_URL` | for integration tests | unset | unset | Isolated PostgreSQL 16 database. Never a Neon URL |
| `SHADOW_DATABASE_URL` | for `prisma migrate dev` | unset | unset | Prisma drift checks when creating a migration |

The Neon integration also adds other `DATABASE_*` names (`DATABASE_PGHOST`, `DATABASE_POSTGRES_PRISMA_URL`, and so on). The app does not read them; leave them alone.

## Running and testing

| Command | What it does | Needs |
| --- | --- | --- |
| `npm run dev` | Development server on port 3000 | `DATABASE_URL`, `JWT_SECRET` |
| `npm run build` / `npm run start` | Production build and server. `build` does **not** migrate | `DATABASE_URL`, `JWT_SECRET` |
| `npm run lint` | ESLint | |
| `npm run typecheck` | `next typegen && tsc --noEmit` | |
| `npm run format` / `format:check` | Prettier write / check | |
| `npm test` | Unit and component tests (Vitest, jsdom) | nothing external |
| `npm run test:coverage` | Coverage gate: overall lines ≥ 80%; `src/lib/domain/` lines and branches ≥ 95% | |
| `npm run test:integration` | Route handlers and services against real PostgreSQL. Migrates `TEST_DATABASE_URL` first and resets it between files | `TEST_DATABASE_URL` |
| `npm run test:e2e` | Playwright in Chromium: smoke, full loop, and responsive checks at 390px and 1040px. Starts the dev server itself locally | a migrated `DATABASE_URL`, `JWT_SECRET`, and `npx playwright install chromium` once |

Before opening a pull request, run `npm run lint`, `npm run typecheck`, and `npm test`; CI runs everything else.

### CI

Every pull request into `main` runs GitHub Actions: lint, typecheck, and unit tests; coverage; integration tests against a PostgreSQL 16 service; Playwright end-to-end tests against a production build with its own PostgreSQL service; CodeQL; and `npm audit`. Vercel builds a preview of the same branch. AGENTS.md section 10 requires all of it green, and the other partner's approval, before merging.

### Seeing a completed session without waiting

The server completes a session only when its stored end time has passed and presence was met. To demo the result screen without waiting 25 minutes, start a session with a unique task name, then move its end into the past and refresh its heartbeat (this is what `e2e/scheduledEnd.ts` does in tests):

```sql
UPDATE "FocusSession"
SET "endTime" = now() - interval '5 seconds',
    "lastHeartbeatAt" = now()
WHERE status = 'ACTIVE' AND "taskName" = 'Demo essay';
```

It should report `UPDATE 1`. Reload `/focus` and the session completes with real rewards. Use a local or preview database, or a dedicated demo account on production, and always keep the `WHERE` clause.

## How deployment works

```text
GitHub (venuschen999/OnYou)
  ├── pull request ──► GitHub Actions (CI) + Vercel Preview ──► Neon preview branch (one per Git branch)
  └── merge to main ──► Vercel Production (onyou123.vercel.app) ──► Neon main branch
                                         └── password reset ──► Resend API
```

| | Local | Preview | Production |
| --- | --- | --- | --- |
| Triggered by | `npm run dev` | any push to a non-`main` branch | a merge to `main` |
| App URL | `localhost:3000` | per-deployment `*.vercel.app` (Vercel login required) | <https://onyou123.vercel.app> (public) |
| Database | your PostgreSQL | a Neon branch for that Git branch | the Neon `main` branch |
| Migrations | `npx prisma migrate deploy` | `npm run vercel-build` during the build | `npm run vercel-build` during the build |
| `JWT_SECRET` | your `.env` | Preview value | Production value |

## First-time deployment setup

This is how the current deployment was set up (#3). You only need it to recreate the project.

1. **Import the repository into Vercel.** Vercel → Add New → Project → Import **`venuschen999/OnYou`** (grant the Vercel GitHub app access to that repository if it isn't listed). Use the existing repository; don't let Vercel create a copy. The project is named `onyou123`; the name only sets the default URL.
2. **Check Git settings.** Settings → Git: connected repository `venuschen999/OnYou`, production branch `main`. Commit Status, Pull Request Comments, and `deployment_status` events on; Require Verified Commits and Git LFS off.
3. **Create the database.** Project → Storage → Create Database → **Neon** (Free, region `iad1`, same as the app's functions). Turn **Auth** and **Realtime** off. Connect it to **Production and Preview**, tick **Create database branch for deployment → Preview** only, and set the **Custom Prefix to `DATABASE`** so the variables are named `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
4. **Add the remaining variables** (Settings → Environments → Production / Preview → Add Environment Variable):
   - `JWT_SECRET` (Secret): a different `openssl rand -base64 32` value for Production and for Preview.
   - `RESEND_API_KEY` (Secret) and `RESEND_FROM_EMAIL` (Config): Production and Preview. Without a verified domain, Resend's test sender `onboarding@resend.dev` only delivers to the Resend account owner's address.
   - `APP_URL` (Config): Production only, `https://onyou123.vercel.app`.
5. **Deploy.** Deployments → Create Deployment → branch `main`, or merge anything into `main`. The build runs `prisma migrate deploy && next build`, creating the tables on the first deploy.

Leave the Vercel build command at the framework default. Vercel runs the `vercel-build` script automatically; overriding the command with `next build` would skip migrations.

## Day-to-day workflow

1. Branch from the latest `main` (`<type>/<issue>-<short-kebab>`), one issue per branch.
2. Push and open a pull request **into `main`**. CI runs and Vercel builds a preview with its own Neon branch. The preview link appears on the pull request.
3. Get the other partner's approval and green checks, then merge with a regular merge (no squash).
4. Vercel deploys `main` to production and applies any new migrations.
5. Delete the merged branch's Neon preview branch (see [Maintenance](#maintenance)).

## Database migrations

- The committed SQL in `prisma/migrations/` is the schema. `prisma/schema.prisma` holds no connection URL; Prisma 7 reads it from `prisma.config.ts`.
- **Create a migration locally:** change `schema.prisma`, then `npx prisma migrate dev --name <change>` (needs `SHADOW_DATABASE_URL`). Commit the new folder in the same pull request.
- **Apply:** locally with `npx prisma migrate deploy`; on Vercel, automatically in every build through `vercel-build`.
- Never run `prisma migrate dev` or `migrate deploy` against production Neon from a laptop. Production changes only through a `main` deploy.
- Some constraints Prisma can't express (one Active session per account, case-insensitive unique email, durations 15/25/50) live as raw SQL in the first migration.

## Maintenance

**Neon preview branches.** The free Neon plan allows **10 branches**, and every Git branch that gets a preview creates one (`preview/<branch>`). When the limit is reached, new previews fail before building. After a pull request merges, delete its branch: Vercel → Storage → the Neon database → Open in Neon → Branches → `⋮` → Delete. Keep `main`.

**Secrets.** Rotate `JWT_SECRET` by changing it in Vercel and redeploying; everyone is signed out. Rotate the Resend key by creating a new key in Resend, updating `RESEND_API_KEY`, and deleting the old key.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails: `Error: DATABASE_URL must be set before the database client is created` | No database variables for that environment | Connect the Neon database to that environment (step 3 above), then redeploy |
| Preview fails at "Provisioning Integrations": `Branch limit reached` | 10 Neon branches already exist | Delete merged branches' `preview/…` Neon branches, then Redeploy the failed deployment |
| A pull request shows no CI runs, or "Checks awaiting conflict resolution" | The branch conflicts with `main` | Merge `main` into the branch and resolve the conflicts; CI starts on the next push |
| A preview link asks for a Vercel login | Vercel's Standard Deployment Protection on previews | Log in to the project's Vercel account, or test on production |
| Password-reset email never arrives | Missing `RESEND_*` variables, or Resend's test sender only reaches the account owner | Set the variables; use the Resend account's own email, or verify a domain |
| `npm run test:integration` exits at once | `TEST_DATABASE_URL` is not set | Point it at the isolated `onyou_test` database |
| Server logs show `Route "/login": Next.js encountered the unstable value new Date() while prerendering` | The signed-in check reads the clock during prerendering (`src/lib/server/session.ts`) | Known and harmless: pages render and every test passes |
| Production shows "No Production Deployment" | Vercel is connected to the wrong repository, or `main` never built | Settings → Git must show `venuschen999/OnYou`; then Create Deployment from `main` |
