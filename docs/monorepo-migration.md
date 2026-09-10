# Monorepo migration runbook

> **Status: executed.** This documents how `apps/api` and `apps/web` came to share
> one repository, and what is left. Kept for provenance and for the pending phases.

## What was done

| Phase | State |
| --- | --- |
| 1 — graft both histories | done; reference tags `import/api` and `import/web` |
| 2a — merge `features/` | done; the five drifted files were merged as a **union**, not a pick-a-winner (the web copy had gained UI behavior, the api copy domain behavior) — see commit `docs(features)` |
| 2b — union `openspec/` | done; names were disjoint, so a plain union (12 active changes, 10 capabilities, 16 archived) |
| 2c — hoist `.claude` tooling | done; the identical `openspec-*` skills and `opsx` commands live at the root, each app keeps its own `rules/` |
| 2d — root index | done; root `CLAUDE.md`, root `.gitignore` |
| 3 — npm workspaces | done; one root lockfile, deps hoisted |
| 4 — pure-move gate | done; `git diff import/*:apps/* HEAD:apps/* -- src` is empty for both apps, and the functional gate is green (api 244/244, web 279/279, both builds, both lints) — after the two repairs below |
| 5 — set `origin`, push | see below |
| 6 — `packages/contracts` | not started |

### What the functional gate caught that the structural gate could not

The structural gate compares *committed* trees, so by construction it cannot see anything
that never entered git. Both failures were of that kind, and both were invisible until the
suite actually ran.

**1. Gitignored local config does not travel.** `git subtree` grafts committed content
only, so every ignored file stayed behind — and `.env.local` is where the database
credentials live. `apps/api/.env.local` (holding `DATABASE_URL`, `TEST_DATABASE_URL`,
`JWT_SECRET`) had to be copied by hand from the old checkout; without it 30 of 244 api
tests failed on Prisma connection errors, with Postgres itself running fine. The frontend's
`.claude/settings.local.json` was copied the same way. Any other ignored-but-needed file
would have the same problem — the fix is per-file, there is no general one.

**2. Two vitest majors, and hoisting split the type augmentation.**
`apps/web` pinned `vitest ^5.0.0` and `apps/api` pinned `^4.1.2`. npm hoisted api's v4 to
`node_modules/vitest` and nested web's v5 under `apps/web/node_modules/`, while
`@testing-library/jest-dom` sat at the root. Because its `vitest.d.ts` does
`import ... from 'vitest'`, resolved *relative to itself*, the augmentation landed on v4's
`Assertion` — while the web specs' global `expect` came from the v5 they resolved locally.
`npm test -w apps/web` passed (the runtime never consults those types) but
`npm run build -w apps/web` failed with ~20 `Property 'toBeInTheDocument' does not exist on
type 'Assertion'` errors. The old standalone repo had a single vitest, which is why it built.

Two changes were needed, and the second is not obvious:

1. `apps/api` moved to `vitest ^5.0.0` + `@vitest/coverage-v8 ^5.0.0`. Its 244 tests pass
   unchanged on v5 — no config or test edits were required.
2. Aligning versions alone made it *worse*: npm then nested v5 in **both** apps and left
   nothing at the root, so jest-dom could not resolve `vitest` at all. Worse still, this
   survived a clean `rm -rf node_modules && npm install`, so it is npm's hoisting decision
   rather than a stale tree. Declaring `vitest` in the root `devDependencies` pins one copy
   at `node_modules/vitest` where the augmentation resolves, and both apps dedupe onto it.

Neither failure is reachable by inspecting the source diff, which is the point: a
structural gate proves the move was pure, not that it was *complete*.

## Deviation from the plan as written

The plan put a prerequisite first (Phase 0): land the `findAllForListing` day-window fix
in the backend repo *before* migrating, so the migration could not entangle a behavior
change. The migration ran first instead. The reasoning still holds — the fix must be its
own commit inside `apps/api`, never folded into a structural commit — and the pure-move
gate above still proves the move changed no source.

## The features/ merge, in short

In `02` and `07` the two copies had diverged along a layer axis, so five scenario pairs
were collapsed into one scenario each and every scenario from both sides was otherwise
kept. In `06`/`09` the api had added "the order history must record the cancelled item"
while the web had added the no-reason confirmation phrasing; the merge keeps both.
Layer-specific mechanics that crept into the specs belong in each layer's own tests.

---

# Monorepo migration runbook

Merge `pizzaria-cumaru-frontend` and `pizzaria-cumaru-backend` into one repository
(`pizzaria-cumaru`) with npm workspaces.

**The governing rule: the migration moves files, it does not change behavior.** Every
phase below is its own commit, and Phase 4 proves the app trees are byte-identical to
what they were before the move. If a behavior change rides along, you lose the ability
to tell "the query changed" from "the move broke it".

## Target layout

```
pizzaria-cumaru/
  apps/api/            # former pizzaria-cumaru-backend (NestJS)
  apps/web/            # former pizzaria-cumaru-frontend (React + Vite)
  packages/contracts/  # Phase 6 — shared enums + zod schemas
  features/            # ONE copy of the product specs
  openspec/            # ONE change/spec store
  .claude/             # shared tooling (skills, opsx command)
  CLAUDE.md            # thin root index
  package.json         # workspaces + cross-app scripts
```

`apps/api` / `apps/web` are just names — renaming to `backend`/`frontend` is a
`git mv` at any point before Phase 5.

## Facts this plan relies on (verified)

| Fact | Value | Consequence |
| --- | --- | --- |
| Branches | both on `master` | one branch name to graft |
| CI | neither repo has `.github/` | nothing to re-path |
| Toolchain | npm, vitest, oxlint, prettier on both sides | workspaces are low-friction |
| Node / npm | v24.17.0 / 11.13.0 | npm workspaces supported |
| Module resolution | api: `NodeNext` + `.js` specifiers · web: `bundler` + extensionless | a shared package must ship built JS + `.d.ts` (Phase 6) |
| `git subtree` | available (git 2.55) | histories can be grafted intact |
| Prisma client | committed under `src/prisma/generated/`, imported relatively | hoisting can't break it; no `postinstall` generate needed |
| `features/` | duplicated, **5 of 9 files already drifted** | needs a human reconciliation pass (Phase 2a) |
| `openspec/specs/` | 5 UI-level (web) + 5 domain-level (api) capabilities, **no name overlap** | plain union, no conflict |
| `openspec/changes/` + archives | all names distinct | plain union |
| `.claude/rules/` | both have `01,02,03,04,08` with **different content** | stay per-app, do not merge (Phase 2c) |
| `.claude/skills/` + `commands/opsx` | identical in both repos | keep one copy at root, delete the rest |

## Phase 0 — land the listing fix first

The `findAllForListing` day-window fix (`prisma-orders-repository.ts:89`) is a behavior
change in the backend repo. Do it, run the backend suite, push it, **then** start.

## Phase 1 — graft both histories

```bash
cd ~/Development
git init -b master pizzaria-cumaru
cd pizzaria-cumaru
git commit --allow-empty -m "chore: initialize the monorepo root"

git remote add api git@github.com:JhonatanKennedy/pizzaria-cumaru-backend.git
git remote add web git@github.com:JhonatanKennedy/pizzaria-cumaru-frontend.git
git fetch api master
git fetch web master

git subtree add --prefix=apps/api api master
git tag import/api
git subtree add --prefix=apps/web web master
git tag import/web
```

No `--squash`: that would collapse the history you are trying to preserve. Git prints a
note that `subtree` is not officially supported — expected, ignore it.

The tags are the reference points Phase 4 diffs against. Do not skip them.

## Phase 2 — reconcile the artifacts both repos own

Each step is one commit. Work top-down; the tree is not consistent until (d).

### 2a. `features/` — reconcile, then keep one copy

```bash
diff -u apps/web/features apps/api/features
```

Five files differ and the differences are semantic, not cosmetic:

- `09_cancellation_and_payment.feature` — web says *"cancels the item ... through the
  plain confirmation"* (a UI mechanism); api says *"cancels the item"* and additionally
  asserts *"the order history must record the cancelled item and the cancellation time"*
  (a domain rule the web copy never learned).
- `03_table_order.feature` — web: *"table 5 is free"*; api: *"table 5 is registered and
  free"* (the FK requires the table to exist).
- also `02`, `06`, `07`.

Resolve per hunk toward **layer-neutral product intent in the shared file**, and push
the layer-specific mechanics into the layer's own tests — `"through the plain
confirmation"` is an assertion for a component spec, `"the order history must record
..."` is an assertion for a backend unit/e2e spec. That is the whole point of having one
copy.

```bash
git mv apps/web/features features
git rm -r apps/api/features
```

Then repoint the rules that reference `features/*.feature` — they now live two levels
up from each app:

- `apps/api/.claude/rules/01-project-context.md` (line ~3, ~110), `02-testing.md` (~153),
  `08-conventions.md` (~30)
- `apps/web/.claude/rules/01-project-context.md`, `08-conventions.md`
- both `CLAUDE.md` files

Say "the repo-root `features/`" rather than hardcoding `../../features/` so the prose
doesn't rot.

### 2b. `openspec/` — union into the root

```bash
git mv apps/web/openspec openspec
git mv apps/api/openspec/changes/catalog-crud           openspec/changes/
git mv apps/api/openspec/changes/complete-waiter-order-flow openspec/changes/
git mv apps/api/openspec/changes/daily-sales            openspec/changes/
git mv apps/api/openspec/changes/kitchen-cancel-preparation openspec/changes/
git mv apps/api/openspec/changes/order-and-catalog-polish   openspec/changes/
git mv apps/api/openspec/changes/table-management       openspec/changes/
git mv apps/api/openspec/specs/authorization openspec/specs/
git mv apps/api/openspec/specs/catalog       openspec/specs/
git mv apps/api/openspec/specs/kitchen       openspec/specs/
git mv apps/api/openspec/specs/orders        openspec/specs/
git mv apps/api/openspec/specs/users         openspec/specs/
git mv apps/api/openspec/changes/archive/*   openspec/changes/archive/
git rm -r apps/api/openspec
```

The two `config.yaml` files are identical — keep the root one and delete the api copy.
Result: 10 capability specs (5 UI-level, 5 domain-level) and the union of active changes
plus both archives.

Note what this does *not* fix: the same behavior is still described twice, at two
altitudes (`waiter-table-orders` vs `orders`). That redundancy is now visible in one
place instead of hidden in two repos — worth a follow-up, out of scope here.

### 2c. `.claude/` — shared tooling at the root, rules stay per-app

```bash
mkdir -p .claude
git mv apps/web/.claude/skills .claude/skills
git mv apps/web/.claude/commands .claude/commands
git rm -r apps/api/.claude/skills apps/api/.claude/commands
```

Verify they really are identical before deleting the api copies (`diff -r`); if any
skill has drifted, reconcile it first.

**Leave `apps/api/.claude/rules/` and `apps/web/.claude/rules/` exactly where they are.**
They collide by filename but not by content — the frontend's rules forbid TS enums and
mandate pt-BR labels, the backend's mandate NestJS layering and Prisma conventions.
Claude Code loads `CLAUDE.md` hierarchically, so each app's `@.claude/rules/*` imports
keep resolving to its own set with zero rewriting. Merging them into one root set is the
wrong move: you would have to reconcile two rulebooks that deliberately disagree.

Hoisting the genuinely shared ones (`03-javascript.md`, `04-typescript.md`,
`05-comments.md` — web-only today) into the root set is optional follow-up work, and
only after diffing them.

### 2d. root `.gitignore` and root `CLAUDE.md`

Keep both app-level `.gitignore` files untouched (nested ignores work fine) and add a
root one for what now lives at the root — `node_modules/` (workspace hoisting puts it
here), `dist/`, `.env*`.

Write a new root `CLAUDE.md` as a thin index: what the monorepo is, where each app
lives, which app owns which context, where `features/` and `openspec/` now are, and the
two run commands. Do not duplicate the app rulebooks into it.

## Phase 3 — root workspaces

Create the root `package.json`:

```json
{
  "name": "pizzaria-cumaru",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "vitest": "^5.0.0"
  },
  "scripts": {
    "dev:api": "npm run start:dev -w apps/api",
    "dev:web": "npm run dev -w apps/web",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "format": "npm run format --workspaces --if-present"
  }
}
```

Then move dependency resolution to the root — **two lockfiles in one repo is the classic
way this migration half-lands**:

```bash
git rm apps/api/package-lock.json apps/web/package-lock.json
rm -rf apps/api/node_modules apps/web/node_modules
npm install          # creates the root package-lock.json, hoists node_modules
```

Env files stay per-app: neither Vite nor Nest reads a parent-directory `.env`, so
`apps/api/.env.local` and `apps/web/.env.local` keep working as-is. A root `.env` would
be silently ignored — don't create one.

`docker-compose.yml`, `prisma.config.ts`, `migrations/` and `docs/` stay in `apps/api`.
Moving compose to the root is a preference, not a requirement.

## Phase 4 — prove it was a pure move

The structural gate. Only the duplicated directories should have disappeared:

```bash
git diff --stat import/api:apps/api HEAD:apps/api
git diff --stat import/web:apps/web HEAD:apps/web
git diff import/api:apps/api HEAD:apps/api -- src
git diff import/web:apps/web HEAD:apps/web -- src
```

The last two must print **nothing**. If they print anything, a source file was edited
during the migration — find it before going further.

History survived:

```bash
git log --oneline -- apps/api/src/orders/infrastructure/prisma-orders-repository.ts
```

Then the functional gate:

```bash
npm install
npm run lint --workspaces
npm test -w apps/api
npm test -w apps/web
npm run build -w apps/api
npm run build -w apps/web
```

And one real end-to-end pass, because none of the above proves the two apps still talk
to each other:

1. `docker compose up -d` in `apps/api` (Postgres)
2. `npm run dev:api` and `npm run dev:web`
3. log in as `ana.gerente`, open `/waiter/tables`, open a table's order
4. check `/manager/menu` and `/reports/daily-earnings` render data

Sanity check that also confirms the env wiring: the browser must hit
`http://localhost:3000` with a bearer token (see `apps/web/.env.local` / `VITE_API_URL`).

## Phase 5 — publish

```bash
git remote remove api
git remote remove web
git remote add origin git@github.com:JhonatanKennedy/pizzaria-cumaru.git
git push -u origin master
```

Then **archive** the two old GitHub repos (Settings → Archive) rather than deleting
them — they stay readable at their URLs, which matters for any links in PRs, issues or
notes. Deleting them is the one step in this plan that isn't reversible.

Rollback at any point before Phase 5: the two origin repos are untouched, so
`rm -rf ~/Development/pizzaria-cumaru` restores the previous state exactly.

## Phase 6 — `packages/contracts` (separate change, separate commit)

Only after Phase 4's gates pass. This is the phase that removes a category of drift, and
it is also the phase that can balloon, so it gets its own commit and its own scope.

**The shape.** Values and wire schemas only — `ORDER_TYPES`, `ORDER_STATUSES`,
`PAYMENT_TYPES`, `USER_ROLES` as `as const` arrays with derived unions, plus the response
zod schemas currently hand-written in `apps/web/src/api/*.api.ts`
(`orderListingSchema`, `tableListingEntrySchema`, the catalog item shape).

**Why built output, not raw source:** the api resolves `NodeNext` and the web
`bundler`. A raw-TS package can't satisfy both cleanly. Build to `dist/` with `tsc`,
declare an `exports` map (`types` + `default`), and let both sides import the bare
package name. Leaf source with no relative imports avoids the `.js`-suffix question
entirely.

**Zod must be a `peerDependency`** (`"zod": "^4"`), not a dependency — two zod instances
in one workspace means schemas from one may not satisfy the other's types, and the web
app already pins zod 4.

**Adoption, in this order:**

1. web: have `apps/web/src/api/*.api.ts` import the schemas from the package and
   re-export them; the fetch functions stay put. No component changes.
2. api: optional, and **not** in this commit. The backend uses TS `enum`s
   (`EOrderType`, `EOrderStatus`, `EUserRole`), and `erasableSyntaxOnly` forbids those in
   web code — so the package authors `as const` unions. Converting the api's enums to
   consume the shared values is a domain refactor with its own test surface. Do it
   later, deliberately, or not at all.

**Non-goal:** do not let a backend refactor ride into the migration commit. That is the
same mistake Phase 0 exists to avoid.

## Known residuals

- **`features/` reconciliation is manual.** No tooling can decide which hunk of a drifted
  scenario is authoritative. Do it once, in 2a, reading both sides.
- **The product is still described at two altitudes** — Gherkin in `features/` and
  capabilities in `openspec/specs/` (UI-level and domain-level). Consolidating that is a
  modeling decision, not a migration step.
- **Claude Code project memory is keyed by directory path.** Notes accumulated against
  `-home-jhonatan-Development-pizzaria-cumaru-frontend` don't follow the code into
  `apps/web`. Copy the directory if any of it is worth keeping.
- **npm hoisting is a real change** to where modules resolve from, even though it's
  invisible when it works. If either app breaks after Phase 3, the diff to inspect is
  `node_modules` layout, not source. Concretely: **keep shared test tooling on one major
  version across the workspace and declare it at the root.** Two majors of one runner is
  what broke the web build — see the two repairs above.
- **The functional gate must run in the new tree, and it must include `build`.** Two of the
  three defects this migration actually shipped with were invisible to tests: the api tests
  needed a file that never travelled, and the web failure showed up only under `tsc -b`.
  `npm test` alone would have passed on a tree that could not be built.
- **The old checkout and the new one compete for the same local ports**, so they cannot both
  run: the compose project name comes from the directory, so `apps/api`'s stack (`api-db-1`)
  binds 5432 while `pizzaria-cumaru-backend`'s (`pizzaria-cumaru-backend-db-1`) still holds
  it, and both APIs want 3000. Bring the old checkout's stack and server down before
  starting the new ones. `PORT=3001 npm run start -w apps/api` works for a headless check
  (`src/main.ts` reads `process.env.PORT`), and `.env.local`'s `DATABASE_URL` points at the
  same database either way — which is convenient for verification and a trap if you expect
  the two checkouts to be isolated.
