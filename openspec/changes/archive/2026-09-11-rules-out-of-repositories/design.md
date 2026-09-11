## Context

See proposal.md — Why. What shapes the approach:

- **28 domain methods across four Symbol-tokened repository interfaces** — `IOrdersRepository` 8, `ICatalogRepository` 10, `ITablesRepository` 5, `IUserRepository` 5. The seam is real and already domain-shaped; what leaks is not the signature but the *content* behind it.
- **All the rule content sits in two adapters.** `PrismaOrdersRepository` carries `dayWindow`, `openOrderConditions`, `completedWhere` and the `P2003 → 'Table not found'` translation; `PrismaTablesRepository` carries the floor's ordering. `PrismaCatalogRepository` and `PrismaUserRepository` assert only round-trip and mapping — they are clean.
- **The in-repo precedent for the target shape is the kitchen.** `ListKitchenQueueUseCase` holds `isVisibleInQueue` as a private predicate over a coarse `findAllOpen()`, and `list-kitchen-queue.spec.ts` drives it with `{ findAllOpen: vi.fn(async () => orders) } as unknown as IOrdersRepository`. No database, milliseconds.
- **The counter-example is the listing.** `ListOrdersUseCase` (68 lines) and `ListDaySalesUseCase` (58 lines) are pure mappers with no decision in them; the decisions are in the adapter's `where`.
- **The product already states these rules.** `openspec/specs/orders/listing/spec.md` holds four scenarios — overnight-open stays listed, an in-cycle delivery from an earlier day stays listed, an earlier day's completed orders stay out, the day's own orders are listed whatever their status — that map one-to-one onto four tests in `prisma-orders-repository.spec.ts`. Two statements of one rule, and only the technology-bound one runs.
- **`06-domain.md:109` already forbids this**: "Repository interfaces and implementations contain no business rules; enums cross the persistence boundary as strings guarded by parse guards". The rulebook is right and the code is wrong; this change makes them agree rather than relaxing the rule.
- **The suite's shape today:** 33 colocated specs, of which 4 are Prisma adapter specs, plus 8 `test/*.e2e-spec.ts`. Only those 12 need Postgres.

## Goals / Non-Goals

**Goals:**

- Every rule the api enforces is stated in the domain and provable in a millisecond spec.
- `npm test -w apps/api` runs green with no Postgres, no Docker and no `.env.local`.
- The adapters keep their queries. A query becomes a *translation* of a domain value, never the only statement of the rule.
- The rulebook stops overstating: the documents describe the suite that exists, which is the suite that existed before.

**Non-Goals:**

- **Authorization policy.** The `@Roles` decorators carry rules ("only the manager can close an order") that are only reachable over HTTP, and the 9 `.expect(403)` assertions in the e2e specs are their only test. Deliberately deferred, not solved.
- **Replacing the adapter-translation check.** The four adapter specs keep their authority over mapping and the `where` they build, but they no longer open a connection, so nothing here proves Postgres honours the query. That closure is `test/`'s e2e specs and, for the composed path, the browser suite — later.
- **De-duplicating `PrismaCatalogRepository`'s inline mapping.** It repeats the item mapping three times and the ingredient mapping three times. Real drift risk, but it is duplication cleanup, not rule relocation — a separate change.
- **Splitting `EOrderStatus`'s two axes** (local lifecycle vs delivery cycle), currently recorded as debt in `08-conventions.md`. This change makes the mixing *less* costly by putting the compensation in one place, but does not remove it.

## Decisions

### 1. The rule is domain data; the adapter translates it

```
  today                                    after
  ---------------------------              ---------------------------
  PrismaOrdersRepository                   src/orders/domain/
    private openOrderConditions()   -->      day-window.ts     dayWindow, isInWindow
    private completedWhere()                 order-progress.ts IN_PROGRESS_STATUSES_BY_TYPE,
    private dayWindow()                                        isInProgress
                                             order-sales.ts    SALES_STATUSES_BY_TYPE,
  (the only statement of the rule)                             salesInstantOf
                                           + a private predicate in each listing use-case
                                           + the same values, read by the adapter to build
                                             the where clause
```

The status sets become `Readonly<Record<EOrderType, …>>`, so an enum member added without a decision is a **compile error** rather than a silently unlisted order. The instants become a function of the aggregate (`salesInstantOf(order)` returns `closedAt` for a closed local, `deliveredAt` for a delivered delivery); the adapter reads which column carries it from that, and the use-case reads the same function to judge in memory.

*Alternative — leave the rules in the adapter and add one conformance test* (query the repository and assert the same population the spec describes). Rejected: it is a good design, and it is exactly the design this change exists to remove. The conformance test needs Postgres, so the rule would stay unreachable without technology — the premise of the whole change.

*Alternative — move the whole rule into the use-case and let the adapter return everything.* Rejected: the listing's population is not bounded by a status set. "Every order, ever" is the only query that needs no rule, and it grows without limit.

### 2. The use-case is the authority; the adapter's `where` is an optimization

The listing use-cases apply the domain predicate to what they receive, and the adapters build their `where` from the same domain values. This looks redundant, and the redundancy is deliberate — it is asymmetric:

- The **use-case predicate** decides. It is live code, it is what the specs exercise, and it is the statement of the rule.
- The **adapter's `where`** narrows the fetch. It cannot change the answer, because anything it over-returns is filtered out above it.

What this buys is worth the duplicate wording: the four `orders/listing` scenarios become millisecond specs over literal `Order`s, which is the entire point of the change. What it cannot buy is protection from a `where` that is too **narrow** — a row never fetched cannot be filtered back in. That residual is the accepted gap, and it is not hidden by the filter (see Risks).

*Alternative — no filter in the use-case, the adapter alone decides.* Rejected: the composition (day window ∪ in-progress) then lives only in the adapter, so `orders/listing`'s scenarios stay technology-bound and the change would deliver nothing for its flagship example.

*Alternative — the adapter returns a coarse superset (today's `findAllOpen` shape) and the use-case does all the filtering.* Rejected for the sales path: the superset would have to be "all orders", because neither status nor window excludes safely. For `findAllOpen` the shape already works, which is why the kitchen does it and needs no change.

### 3. Where each rule goes

| # | Rule today, in the adapter | New home | Spec that covers it |
| --- | --- | --- | --- |
| 1 | `openOrderConditions` — Local `Open`; Delivery `Open`/`Preparing`/`Out for delivery` | `orders/domain/order-progress.ts` | `order-progress.spec.ts` |
| 2 | `completedWhere` — a sale is a closed local by `closedAt`, a delivered delivery by `deliveredAt` | `orders/domain/order-sales.ts` | `order-sales.spec.ts` |
| 3 | `dayWindow` — the calendar day | `orders/domain/day-window.ts` | `day-window.spec.ts` |
| 4 | the listing's population — the day's orders ∪ still in progress | private predicate in `ListOrdersUseCase` | `list-orders.spec.ts` |
| 5 | the sales population — the same, over the sales rule | private predicate in `ListDaySalesUseCase` | `list-day-sales.spec.ts` |
| 6 | `attachWaiterNames`' `?? null` | **stays in the adapter** | — none; see below |
| 7 | `P2003 → 'Table not found'` | `CreateOrderUseCase`, over a new `IOrdersRepository.existsTable`, with the catch kept as a race backstop | `create-order.spec.ts` |
| 8 | `orderBy: { number: 'asc' }` | `ListTablesUseCase` sorts its own output | `tables-use-cases.spec.ts` |

Rule 6 is dropped from the move on closer reading: the fallback is a one-line default for a joined row that is missing, not a decision the product makes. The meaningful part of `attachWaiterNames` is that the orders adapter reaches into the `user` delegate to resolve names — a persistence concern, and persistence concerns stay in `infrastructure/`.

Rule 7 is the one that could reasonably stay: a foreign key *is* technology, and translating `P2003` into a domain message is the same kind of act as the parse guards `06-domain.md:109` explicitly blesses. It moves anyway because the refusal is a product rule ("an order must reference a registered table") that is currently assertable only with a database.

It moves into `CreateOrderUseCase` rather than to a `TABLES_REPOSITORY` lookup, for a reason worth recording: **the module graph forbids the obvious wiring.** `TablesModule` already imports `OrdersModule` (the floor view reads `findAllOpen`, and the delete path asks whether a table has orders), so having `OrdersModule` import `TablesModule` closes a cycle. The use-case already owns this family of refusal — `'Table already has an open order'` comes from `findOpenByTableId` there — so the existence check joins it over a new `existsTable(tableId): boolean` on `IOrdersRepository`. That puts one `table` read in the orders adapter, which is a smaller cost than a cycle, a `forwardRef`, or a new port with a Symbol, an interface and a provider to serve one boolean.

The catch is not deleted: `save()` keeps it, commented as a backstop for a table deleted between the check and the insert, so that race still yields a `400` rather than a `500`. Nothing asserts the backstop, and it is not worth a test that needs Docker to exist.

### 4. The day window's end is corrected

```ts
// today — 24 hours after local midnight
return { start, end: new Date(start.getTime() + MS_PER_DAY) };

// after — the next local midnight
return { start, end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1) };
```

On a DST transition the first form produces a 23- or 25-hour day, and the report silently includes an hour of the next day or drops one of its own. Brazil abolished DST in 2019 and the values are local dates, so the bug is dormant, not live — recorded at its real severity rather than talked up.

It is corrected here rather than merely relocated because extracting the function forces the question: a pure spec has to assert *something*, and the honest assertion is "the window is the calendar day". Pinning `start + 24h` would enshrine the bug in a test whose whole purpose is to state the rule. `Date`'s month/day overflow handles the month and year boundaries, which the spec pins.

### 5. `skip_specs: true` — no capability changes

The rules keep their meaning; only their address changes. No requirement, scenario, route, status code or message changes, and the day-window correction brings an implementation into line with the calendar-day rule `orders/listing` and `daily-sales` already state. `openspec/specs/orders/listing/spec.md` needs no delta — scenario for scenario, its four scenarios describe what the four new millisecond specs assert.

### 6. The specs that needed Postgres stay; the dependency goes

**Revised 2026-09-11 — the original decision was to delete these.** The goal was "`npm test` runs with no Postgres", and deleting the specs that needed one was the planned route to it. The route taken instead removes the *dependency*: every spec that existed before this change still exists, and `npm test` still needs no database, no Docker and no `.env.local`.

```
apps/api/test/*.e2e-spec.ts                          8   journey coverage over HTTP — kept
apps/api/src/**/prisma-*-repository.spec.ts          4   rebuilt on a PrismaService double, not deleted
apps/api/vitest.config.e2e.ts                            kept
package.json: test:e2e, supertest, @types/supertest      kept, since test/ stays
```

The four adapter specs were the only ones that opened a connection. They are rewritten onto a `vi.fn()`-per-method double, each constructing its repository as `new PrismaXRepository(double as unknown as PrismaService)` and asserting three things: the aggregate it builds from fake rows, the `where`/`include`/`orderBy` it asks Prisma for, and the `P2003 → 'Table not found'` translation. The `where` assertions, with expected values written out literally, are what gives decision 2's accepted gap its teeth — they do not prove Postgres honours the query, but they do prove the adapter mirrors the domain's rule tables, and a hardcoded status literal now fails a test.

What is genuinely given up by keeping them rather than deleting them is nothing; what is given up by *rewriting* them is the round-trip proof — that a row written and read back survives, and that Postgres honours the `where`. That is decision 2's gap, named in Risks, not a consequence of this decision.

### 7. The borderline specs stay

**Revised 2026-09-11 — the original decision was to delete three of them.**

| Spec | Verdict | Why |
| --- | --- | --- |
| `users/application/session-tokens.spec.ts` | keep | Token lifecycle decisions, no I/O |
| `common/guards/roles.guard.spec.ts` | keep | Who may call what, against a mocked context — no HTTP |
| `config/env.validation.spec.ts` | keep | Env parsing is framework wiring, but the spec is pure and ran without a database all along |
| `config/cors.spec.ts` | keep | Header assembly, same reasoning — deleting it was never load-bearing for the goal |
| `common/filters/domain-error.filter.spec.ts` | keep | Status-code mapping for domain errors, same reasoning |

None of the three was ever a reason `npm test` needed Postgres: they take no Prisma client and no `Test.createTestingModule`, so they were already running in milliseconds. They were slated for deletion as "framework wiring", which is an argument about what deserves a test, not about the dependency this change exists to remove — and with the dependency removed, the argument no longer buys anything. Removing them would have been scope the goal did not require.

The guard spec is adjacent to the deferred authorization work but not part of it: it tests the guard's own logic, not the `@Roles` policy the decorators carry.

Keeping the filter spec means the backend still pins "a domain `Error` becomes a `400`" in isolation. It does not pin the *path* to it — that a `DomainErrorFilter` reachable from a controller turns a thrown aggregate error into a 400 response — and no test does; that closure is `test/`'s e2e specs, and it is named in Risks rather than quietly absorbed.

### 8. Extract first, rewrite second

The tasks are ordered so that every rule has a passing test at the new address **before** the spec at the old one stops asserting it. Reversing the order fails silently in the worst way: the suite stays green, and the coverage is simply gone. Each move is therefore verifiable on its own — write the domain spec, watch it pass, then rewrite the adapter spec that duplicated it onto a double.

`vitest.config.ts`'s `fileParallelism: false` existed only because the integration specs truncated a shared database. No spec opens a connection now, so serialising files buys nothing and it goes — the suite went from 4.3s to 0.7s.

## Risks / Trade-offs

- **A `where` that is too narrow drops rows silently, and the use-case filter cannot rescue them.** This is the change's real residual. Mitigated by building the `where` from the same domain values the predicate reads, so the only way to disagree is Prisma's own semantics — and by the browser suite, which exercises the composed path. Not eliminable by any test that runs without a database.
- **The adapter specs keep their `where` assertions but lost their round-trip proof.** They no longer show that a row written and read back survives, or that Postgres honours the query. Accepted explicitly; the gap is closed by `test/`'s e2e specs for the paths they cover, and recorded in `08-conventions.md` rather than left as an absence.
- **A rule moved to the wrong layer is worse than a rule left in the adapter**, because it looks right. Mitigated by decision 3 naming each rule's home and spec, and by the moves being one-rule-at-a-time.
- **The day-window change is a behavior change on a DST day.** Brazil has none; the window is a local date either way. Stated rather than buried because "no behavior change" is otherwise claimed for the whole change.
- **`ListTablesUseCase` sorting in memory is O(n log n) on the floor's table list** — tens of rows, at most twice per screen. Not worth measuring.
- **Two statements of one rule (decision 2) can drift.** They read the same constants, so drift requires editing one and not the other *and* the domain table being wrong, which the domain spec would catch first.

## Migration Plan

One change, landing in the order the tasks fix:

1. The domain vocabulary and its three specs — additive, nothing else touched.
2. The listing and sales use-cases onto the predicates, `ListTablesUseCase` on the sort, `CreateOrderUseCase` on the table check.
3. The adapters reduced to translators.
4. Only then the four adapter specs onto their doubles, the config cleanup, and the rulebook updates.

Rollback is `git revert` of a single change; nothing in `src/` outside the orders and tables contexts is touched, and no schema, migration or HTTP contract moves.

## Open Questions

None. The one question the exploration carried — whether the adapters keep a `where` at all, or go coarse — is settled by decision 2's asymmetry: the sales path has no bounded coarse query, so the `where` stays and the use-case filter sits above it.
