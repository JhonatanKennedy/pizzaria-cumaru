## Context

See proposal.md — Why. The current shape that forces the decisions below:

- `PrismaOrdersRepository` already holds the pattern this change extends. `completedWhere(start, end)` (`prisma-orders-repository.ts:117`) is a named predicate builder shared by `findCompleted` and `findDaySales` — two methods that must agree on what "completed" means. `dayWindow(day)` (`:112`) is the shared local-calendar-day bound.
- `findAllOpen` (`:30`) writes the in-progress predicate inline: local orders at `Open`, delivery orders at `Open`/`Preparing`/`Out for delivery`.
- `findAllForListing` (`:89`) has no status filter at all — only `createdAt` within the day window.
- `findAllForListing` has exactly one production caller, `ListOrdersUseCase` (`list-orders.ts:44`), reached from `GET /orders` with `new Date()` — so the day is always the server's current day.
- The interface returns different shapes per method: `findAllOpen(): Order[]`, `findAllForListing(day): IOrderListingEntry[]` where the entry carries the waiter name already joined by `attachWaiterNames` (`:126`).

## Goals / Non-Goals

**Goals:**

- One definition of "in progress" in the repository, used by both the floor view's query and the listing.
- An order left open overnight keeps its table reachable and closable.
- The listing's scope becomes a stated contract, so a future divergence fails against something.

**Non-Goals:**

- No third disjunct. An order created *and* completed before the requested day stays out of the listing even if it was completed today. The listing is work-in-flight; the day's money is `/reports/daily-sales`, which keys on `closedAt`/`deliveredAt`. See decision 5.
- No `GET /orders/:orderId`. See decision 3.
- No change to `findDaySales` or `findCompleted`, and no schema, migration or DTO change.
- `dayWindow`'s `MS_PER_DAY` arithmetic is fragile across a DST transition (23h/25h wall-clock days). Latent since Brazil dropped DST in 2019, adjacent to this code, and deliberately not touched here.
- The SPA's stale comment and delivery empty-state copy stay as they are; recorded as a follow-up in the proposal rather than folded into a backend change.

## Decisions

**1. Widen the listing; do not narrow the floor view.**

The cheaper-looking fix is to bound `findAllOpen` to the current day so both queries cover the same set. It makes them agree in the wrong direction: a table with an unclosed order would render "Livre", the order would be reachable from nowhere, and the guest's billable order would be silently invisible. Agreeing upward is the only direction that cannot lose an order.

**2. Extract `openOrderConditions(): Prisma.OrderWhereInput[]` beside `completedWhere`.**

The bug exists because the in-progress rule was written inline, once, so the listing never learned it. Inlining it a second time reproduces that failure mode exactly. The repository already solved this shape for "completed" — this is the same move for "in progress".

Returning the *conditions array* rather than a wrapped `{ OR: [...] }` lets each method own its own `OR` and compose by spread:

```ts
private openOrderConditions(): Prisma.OrderWhereInput[] {
  return [
    { type: 'Local', status: 'Open' },
    { type: 'Delivery', status: { in: ['Open', 'Preparing', 'Out for delivery'] } },
  ];
}
```

Prisma accepts a nested `OR` either way; the flattened form just avoids the question and keeps each `where` readable.

**3. Rejected — add `GET /orders/:orderId`.**

The tempting REST answer, and it would fix the detail screens: they currently look the order up inside the listing (`ordersQuery.data.find((entry) => entry.id === orderId)`). Rejected because it repairs only the detail page. The manager's delivery list reads the same listing and filters it by type, so an overnight delivery still in its cycle would still vanish from the screen that is supposed to surface it. It also adds new surface — a route, a DTO, a use-case, e2e coverage — for what is a missing *row*, not a missing read capability, and it would ripple into `orders.api.ts`, a new hook and a loading state across two screens.

**4. Rejected — union the two repository calls in the use-case.**

`findAllOpen` returns bare `Order[]`; `findAllForListing` returns entries with the waiter name already joined. Merging them in the application layer would either drop the waiter attribution for the revived rows or force a second join back in the use-case — and it leaves the union, which is a query concern, expressed in two places. One `where` is the honest home.

**5. No third disjunct: the listing does not gain earlier-created, today-completed orders.**

With the union alone, an order created yesterday and closed today leaves the listing the moment it is closed. That asymmetry is visible — an order created and closed today stays — and it is the right one. The listing exists so the floor, the waiter and the delivery manager can act on live work; once the order is closed there is nothing to act on. Its money is already recorded by `findDaySales`, which keys on `closedAt`/`deliveredAt`, so nothing is lost from the day's trade. Adding `completedWhere(start, end)` as a third disjunct would keep closed orders on an operational screen for the rest of the day, which is a different product decision than the one this change is making. Recorded here so a future reader sees it as a choice, not an oversight.

**6. No Gherkin scenario for the overnight order — the scope lives in the new capability instead.**

Task 4.1 asked whether the feature files own this behaviour. Neither does:

- `features/10_table_management.feature` says "the listing" seven times, but every hit is the *table* listing — the floor view (`GET /tables`). Its scenarios assert which tables appear and whether they show a running total. That query is `findAllOpen`, whose behaviour this change does not alter, so the file is unaffected.
- `features/03_table_order.feature` never mentions the listing at all; its scenarios are about items on an order.
- The nearest claim is `features/07_manager_profile.feature:64`, "the manager accesses the list of the day's orders". That scenario's subject is waiter attribution ("each order must display the name of the waiter responsible"), and its precondition is an order created in the day — the widened set is a superset, so the assertion stays true. "The day's orders" names the screen; it states no scope rule.

So the Gherkin is left untouched rather than given an invented home. The scenario an overnight order would need is a statement about the listing's scope, and that now has a better owner: the `orders/listing` capability added by this change, which states the union and its two exclusions directly. A future reader asking "what does the listing return?" finds the answer in the spec store; the feature files keep describing flows.

## Risks / Trade-offs

- **[The union can no longer be served by a plain `createdAt` range scan]** → It becomes an `OR` over `createdAt` and the status predicate, and the status columns carry no index. At a single restaurant's volume this is immaterial; no migration is worth adding here.
- **[The shared predicate widens the blast radius of future edits]** — changing `openOrderConditions` now also moves the floor view and the kitchen queue's `findAllOpen` → That is the intent, and the new requirement pins the floor/listing agreement so a divergence fails against a written rule rather than going unnoticed.
- **[A web comment and an empty state go stale the moment this ships]** → `delivery-page.tsx` asserts "GET /orders returns only today's orders" and reads "Nenhum pedido de entrega hoje." when empty. Left as a recorded follow-up so this change stays a backend commit.

## Verification note — `npm run format` is not clean, and this change does not make it so

Task 5.3 asks for `lint` and `format` to both come back clean. `lint` does. `format` does not, and the reason is independent of this change:

- There is no `.prettierignore` in the repo — not at the root, not in either app.
- `apps/api`'s script is `prettier --write "src/**/*.ts" "test/**/*.ts"`, and `src/prisma/generated/` is committed, so the glob sweeps the generated Prisma client. Prisma emits its own style (double quotes, no semicolons); the app's `.prettierrc` (`singleQuote: true`, `trailingComma: "all"`) rewrites all of it.
- A run during this change's verification rewrote 17 generated files (+10794/−7285) and two hand-written files that were already not prettier-clean under the pinned prettier 3.9.6 (`add-item-to-order.ts`, `list-kitchen-queue.ts`).

That churn was reverted, so this change's commit stays scoped to the listing. The three files it does touch were checked individually and are prettier-clean. The loop itself — `prisma generate` writes Prisma's style, `npm run format` rewrites it, the next generate undoes that — is a repo-wide condition that predates this change and would recur for any commit that runs the formatter. The likely one-line fix is a `.prettierignore` covering `src/prisma/generated/`, but that is a separate change to the repo's tooling, deliberately not absorbed here.
