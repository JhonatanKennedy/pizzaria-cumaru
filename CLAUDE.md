# CLAUDE.md

Monorepo for the "Pizzaria Cumaru" management system — a NestJS API and a React SPA. It was merged from the former `pizzaria-cumaru-backend` and `pizzaria-cumaru-frontend` repos, and both histories are preserved here.

This file is an index. **Each app carries its own `CLAUDE.md` and its own `.claude/rules/`** — read the one for the app you are working in; they are deliberately different, not accidentally duplicated.

## Layout

| Path | What it is |
| --- | --- |
| `apps/api/` | NestJS + Prisma backend — JWT auth, class-validator DTOs, a global error filter |
| `apps/web/` | React 19 + TypeScript + Vite SPA |
| `features/` | the product specs (Gherkin, English), one file per flow, shared by both apps |
| `openspec/` | the change store — active changes, the capability specs, the archive |
| `packages/` | reserved for shared code — **does not exist yet**; the root `package.json` already globs `packages/*`, so creating the folder is all it takes (see Open, below) |
| `docs/` | the monorepo migration runbook |

## Rulebooks

| App | Rules | Deliberately different because |
| --- | --- | --- |
| `apps/api` | `.claude/rules/01,02,03,04,05-nestjs,06-domain,07-prisma,08-conventions,09-comments` | mandates NestJS layering, aggregate design and Prisma conventions |
| `apps/web` | `.claude/rules/01,02,03,04,05-comments,06-react,08-conventions` | forbids TS enums (`erasableSyntaxOnly`), mandates pt-BR user-facing labels |

Both apps have a comments rule (`05-comments` in web, `09-comments` in api) and they are **not** copies: the web file is about the UI's comments-only-when-needed discipline, the api file adds the mandated use-case header that carries the `Feature:` traceability line. Same for `03`/`04` — shared subject, different examples and different forbidden syntax.

Both index files import their own rule set with `@` paths relative to the app, and `CLAUDE.md` loads hierarchically — so each app's imports keep resolving to its own rulebook. Do not merge the two rule sets.

The openspec tooling is shared: the `openspec-*` skills and the `opsx` commands live in the root `.claude/`.

## Commands

Run from the root — npm workspaces hoists both apps' dependencies there, and there is one lockfile.

| Command | Purpose |
| --- | --- |
| `npm install` | install both apps (root `node_modules`) |
| `npm run dev:api` | NestJS in watch mode — needs Postgres: `docker compose up -d` in `apps/api` |
| `npm run dev:web` | Vite dev server (port 5173) |
| `npm test` | vitest for both apps (`-w apps/web` / `-w apps/api` to scope) |
| `npm run build` | build both apps |
| `npm run lint` / `npm run format` | oxlint / prettier across both |

Environment stays per app: `apps/web/.env.local` (`VITE_API_URL`, default `http://localhost:3000`) and `apps/api/.env.local`. Neither tool reads a root `.env` — don't create one. Seeded logins: `ana.gerente` (Manager), `joao.garcom` (Waiter), `carlos.cozinha` (Cook), password `SenhaSegura123`.

Two things the layout requires and that are easy to undo by accident:

- **`vitest` is a root `devDependency` on purpose.** Both apps must stay on the same major. Two majors makes npm nest the copies, which splits `@testing-library/jest-dom`'s type augmentation away from the `vitest` the specs resolve — tests still pass but `tsc -b` fails. See "What the functional gate caught" in the runbook.
- **`.env.local` files are gitignored, so they never travelled with the migration.** A fresh clone needs both recreated from `.env.example`; `apps/api/.env.local` is required for the api suite to run at all.

## Open

- **`packages/` is empty.** The API contract is still hand-mirrored: `apps/web/src/api/*.api.ts` re-declares the wire shapes in zod and const unions (`ORDER_TYPES`) while `apps/api/src/**/domain/enums/*` declares the same values as TS enums (`EOrderType`, `EOrderStatus`, `EUserRole`). Hoisting them into a shared package is the next planned step — the runbook's Phase 6 in [docs/monorepo-migration.md](docs/monorepo-migration.md).
- **The product is described at two altitudes.** `features/` holds the Gherkin; `openspec/specs/` holds ten capabilities — five UI-level from the web repo and five domain-level from the api repo. The union exposed the redundancy rather than resolving it.
