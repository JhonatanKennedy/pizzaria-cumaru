# Pizzaria Cumaru

Management system for a pizzeria: table and delivery orders, a kitchen panel, menu
and stock management, checkout, and daily reports — with role-based access for
waiters, cooks and managers.

It is a monorepo. A NestJS API and a React SPA were merged from two former repos
(`pizzaria-cumaru-backend`, `pizzaria-cumaru-frontend`) and both histories are
preserved here.

## Layout

| Path | What it is |
| --- | --- |
| `apps/api/` | NestJS + Prisma backend — JWT auth, class-validator DTOs, a global error filter |
| `apps/web/` | React 19 + TypeScript + Vite SPA |
| `features/` | the product specs (Gherkin, English), one file per flow, shared by both apps |
| `openspec/` | the change store — active changes, the 22 capability specs, the archive |
| `scripts/` | `run-e2e.mjs` and the lock it takes; the browser suite's lifecycle |
| `packages/` | reserved for shared code — **does not exist yet**; the root `package.json` already globs `packages/*` |
| `docs/` | the monorepo migration runbook |

Each app carries its own `CLAUDE.md` and its own `.claude/rules/`, and they are
deliberately different rather than accidentally duplicated. Read the one for the app
you are working in before writing code.

## Prerequisites

- **Node.js** — developed against v24. No `engines` field is pinned and there is no
  `.nvmrc`, so any current LTS should work; v24 is what the suite is verified on.
- **npm 11** (npm workspaces; there is a single lockfile at the root).
- **PostgreSQL 16** — the compose file in `apps/api` starts one.
- **Docker**, for that Postgres.

## Setup

```sh
npm install                      # installs both apps into the root node_modules
docker compose -f apps/api/docker-compose.yml up -d   # PostgreSQL on :5432

# The test database is created once, by hand — nothing does it for you:
docker compose -f apps/api/docker-compose.yml exec db psql -U prisma -d postgres \
  -c 'CREATE DATABASE pizzaria_cumaru_test;'
```

Then create the two env files. **They are gitignored, so they never travel with a
clone** — a fresh checkout has neither:

```sh
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local   # optional; defaults to http://localhost:3000
```

`apps/api/.env.local` is required by `npm run dev:api` and by `npm run test:e2e`. It
is *not* required by `npm test`, which runs with no database at all.

Finally, apply the migrations and seed:

```sh
npm exec -w apps/api -- prisma migrate dev   # dev database
npm run seed -w apps/api                     # catalog + tables + users
```

Prisma commands must resolve the workspace: `apps/api/prisma.config.ts` loads
`.env.local` **relative to the working directory**, so running `npx prisma` from the
root fails with `The datasource.url property is required in your Prisma config file`
— it never finds the file. Use the `npm exec -w apps/api` form above, or `cd
apps/api` first.

> Checkouts that predate the monorepo merge may already have a Postgres container
> from the old `pizzaria-cumaru-backend` repo, named `pizzaria-cumaru-backend-db-1`.
> That container is not managed by this compose file, so `docker compose … exec db`
> reports `service "db" is not running` even though Postgres is up and answering on
> :5432 — which is fine, it is the same server. Reach it by container name instead:
> `docker exec pizzaria-cumaru-backend-db-1 psql -U prisma -d postgres …`.

`npm run seed` upserts the three profile users, 12 ingredients, 20 items and 10
tables. It **refuses to run when `NODE_ENV=production`** — it is code, not a
migration.

## Running

```sh
npm run dev:api    # NestJS in watch mode on :3000
npm run dev:web    # Vite dev server on :5173 (pinned — the API's CORS allowlist names it)
```

### Seeded logins

All three use the password `SenhaSegura123`.

| Login | Role |
| --- | --- |
| `ana.gerente` | Manager |
| `joao.garcom` | Waiter |
| `carlos.cozinha` | Cook |

The login page lists these in development only, behind `import.meta.env.DEV` — the
seed is a local fixture, so a production build must not name accounts its deployment
does not have.

## Commands

Run from the repo root. npm workspaces hoists both apps' dependencies there, and
there is one lockfile.

| Command | Purpose |
| --- | --- |
| `npm install` | install both apps |
| `npm run dev:api` | NestJS in watch mode — needs Postgres |
| `npm run dev:web` | Vite dev server on :5173 |
| `npm run build` | build both apps (`nest build`, then `tsc -b && vite build`) |
| `npm test` | vitest for both apps |
| `npm run test:e2e` | browser e2e (Cypress) — **root-only**, starts its own stack |
| `npm run test:e2e:open` | the same, but opens the interactive runner |
| `npm run lint` | oxlint across both apps |
| `npm run format` | prettier across both apps — **see the warning below** |

Any command can be scoped to one app with a workspace flag:

```sh
npm test -w apps/web
npm run build -w apps/api
```

Two cautions:

- **`npm run format` is never clean.** The api's script globs `src/**/*.ts`, which
  reaches the committed Prisma client at `src/prisma/generated/`, and prettier
  rewrites it. Revert that churn — or format only the files you touched, with
  `npx prettier --write --config apps/web/.prettierrc <files>`.
- **`npm run test:e2e` is root-only on purpose.** It owns the database and server
  lifecycle, so a workspace script that skipped that would silently run against
  whatever happened to be up.

## Testing

Three layers, and the rulebooks enforce the split — every business rule gets a unit
test, and e2e covers only complete user journeys.

| Layer | Where | Run with |
| --- | --- | --- |
| Unit + component | colocated `*.spec.ts` / `*.spec.tsx` | `npm test` |
| HTTP contract | `apps/api/test/*.e2e-spec.ts` (supertest, real Postgres) | `npm run test:e2e -w apps/api` |
| Browser journey | `apps/web/cypress/e2e/*.cy.ts` | `npm run test:e2e` (root) |

The two e2e suites bind the same test database, so they take a lock
(`apps/api/.e2e.lock`) and must never run at the same time.

### The browser suite brings its own stack

Cypress has no `webServer` equivalent, so `scripts/run-e2e.mjs` is the whole story:
it reuses a Postgres already listening on the port `TEST_DATABASE_URL` names (and
starts one only if nothing answers), resets and seeds the **test** database, serves
the API and the SPA on a private `3100`/`5174` pair, runs Cypress, and tears down
only what it started. So the suite works whether or not `dev:api` and `dev:web` are
running, and it never touches a developer's own database.

It fail-closes if `TEST_DATABASE_URL` does not name a `_test` database, because the
reset step is destructive. A further argument reaches Cypress untouched:

```sh
npm run test:e2e -- --spec cypress/e2e/auth.cy.ts
```

> **Never run this on the production host.** The `_test` check is a *name* check — a
> production database called `something_test` would pass it. The runner's fallback
> when nothing answers on the Postgres port is `docker compose up -d --wait`, whose
> compose file hardcodes `POSTGRES_DB: pizzaria_cumaru` and the `pgdata` volume; and
> the API it boots calls `app.listen(port)` with no host, so it binds every
> interface — on a public IP that is the seeded logins in this repo, served under
> `NODE_ENV=development`. It belongs on an ephemeral machine with its own Postgres.

## Where the product is described

The product is described at two altitudes, and both are normative for their level:

- `features/*.feature` — the Gherkin, one file per flow (`01_authentication`
  through `10_table_management`; there is no `08`). Screens, routes, user-visible
  messages and component tests should trace back to a scenario in these files.
- `openspec/specs/` — 22 capability specs: 8 UI-level, 14 domain-level. A change
  that restates an existing capability is retargeted onto it rather than minting a
  duplicate.

`openspec/changes/` is the active change store and is empty; completed changes live
in `openspec/changes/archive/`. The `openspec-*` skills and `opsx` commands live in
the root `.claude/`.

## Production readiness

**The application is releasable; the deployment is not yet wired.** As it stands:

- There is **no way to create the first production user.** The seed refuses to run
  in production, and the API exposes only `POST /auth/login`, `/auth/refresh` and
  `/auth/logout` — no user-creation route and no bootstrap script. A fresh
  production database cannot be logged into.
- There is **no deployment artifact**: no Dockerfile, no CI workflow, no reverse
  proxy config. The only compose file is a dev Postgres. `apps/api`'s `"deploy":
  "nest deploy"` is a scaffold leftover targeting a hosted cloud service.
- Nothing serves the SPA's build output, and `VITE_API_URL` is baked in at build
  time, so a production image must be built with the real API URL already set.

What is ready: `apps/api/src/config/env.validation.ts` fails the boot fast when
`CORS_ORIGINS` (always) or `DATABASE_URL` / `JWT_SECRET` / `JWT_REFRESH_SECRET`
(production) are missing, and refuses to start when the two JWT secrets are equal.
`npm run start:prod -w apps/api` runs `NODE_ENV=production node dist/main`, and the
migration path (`prisma migrate deploy`) is documented in `apps/api/README.md`.

Also still open: split bill is specified in `09_cancellation_and_payment` and
unbuilt, the API contract is hand-mirrored between zod schemas and the api's TS
enums until `packages/` exists, and `04_delivery_order` is manager-only in the SPA
while the Gherkin casts it in the waiter's hands.
