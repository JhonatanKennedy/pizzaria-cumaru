## Why

The api's rules about **which orders are in progress**, **which count as a day's sales**, and **which belong in the listing** are not in the domain — they are `where` clauses inside `PrismaOrdersRepository`, and the only tests that assert them open a PostgreSQL connection. `06-domain.md` already forbids this ("Repository interfaces and implementations contain no business rules"); the code contradicts the rulebook, and the contradiction is why `npm test -w apps/api` cannot run without Docker.

The cost is not just the Docker dependency. The four listing scenarios in `openspec/specs/orders/listing/spec.md` are the product's statement of those rules, and the four tests in `prisma-orders-repository.spec.ts` are the same content at the persistence altitude — of the two, only the second runs today, and only with a database.

## What Changes

- **Move the rule content out of the adapters and into the domain**, as data and pure predicates: the statuses that mean "in progress" per order type, the statuses and timestamps that make a sale, the day window, the listing's overnight rule, and the floor's ascending order. The adapters keep their queries and **build the `where` from the domain's values**, so a query becomes a translation of a rule instead of a statement of one.
- **Move the "an order must reference a registered table" refusal** out of a caught Prisma `P2003` and into the create use-case, where a repository double can exercise it.
- **Correct the day window's end** — `start + 24h` becomes the next calendar day. On a DST transition the current arithmetic produces a 23- or 25-hour day; Brazil has had no DST since 2019, so the bug is dormant rather than live.
- **No spec is deleted.** The original plan reached "`npm test` needs no Postgres" by deleting the 15 specs that needed one — the 8 e2e specs, the 4 adapter specs and 3 technology specs — plus `vitest.config.e2e.ts`, the `test:e2e` script and the `supertest` devDependencies. **Revised 2026-09-11: the dependency is removed instead of the specs.** The four adapter specs are rebuilt onto a `PrismaService` double; the e2e specs and `test/` stay, and so do the three technology specs, which never opened a connection. After this, `npm test -w apps/api` runs with **no Postgres, no Docker and no `.env.local`** — not one spec file removed (`git status --porcelain | grep -c '^ D.*spec'` is `0` across the change), and every colocated spec in milliseconds.
- **Update the rulebooks** (`02-testing.md`, `01-project-context.md`, `08-conventions.md`, `07-prisma.md`) so they describe the suite that exists rather than the one the original plan described.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — no spec-level behavior changes. The rules keep their present meaning; only their address changes, and the day-window correction brings an implementation into line with the calendar-day rule those specs already state. No requirement, scenario, route, message or HTTP status changes, so `skip_specs: true` is set on this change.

## Impact

- **`apps/api/src/orders/`** — new domain modules for the in-progress, sales and day-window rules; `ListOrdersUseCase`, `ListDaySalesUseCase` and `CreateOrderUseCase` edited; `PrismaOrdersRepository` reduced to a translator and `IOrdersRepository` gains one method. `order-mapper.ts` is not touched.
- **`apps/api/src/tables/`** — `ListTablesUseCase` orders its own output; `PrismaTablesRepository` loses its `orderBy`.
- **`apps/api/` test surface** — nothing deleted. The four adapter specs are rebuilt onto a `PrismaService` double; the e2e specs, `test/` and the three technology specs stay as they were; `vitest.config.ts` drops `fileParallelism: false`, which existed only for the specs that truncated a shared database.
- **No HTTP contract, schema, migration or runtime dependency change.** No production behavior changes; the day-window correction is observable only in a DST timezone, which the product's own never enters.
- **Accepted and recorded, not overlooked:** the adapter specs no longer open a connection, so nothing in the backend proves that a domain rule's translation into a `where` clause is faithful to Postgres — a query that is too narrow drops rows silently. The specs prove the adapter mirrors the domain's rule tables; they cannot prove the database honours the query. That closure is `test/`'s e2e specs, and the browser suite covers the composed path. See design.md, Risks.
- **Residual, outside that gap:** `'Table not found'` keeps its `P2003` catch as a backstop against a concurrent delete, so the message survives a race the use-case check cannot see. Nothing asserts the backstop itself.
