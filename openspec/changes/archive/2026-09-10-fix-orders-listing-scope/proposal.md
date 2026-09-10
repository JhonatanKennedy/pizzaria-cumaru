## Why

Nothing in the spec store states what `GET /orders` returns. `findAllForListing` scopes it to the local calendar day of `createdAt`; the floor view's query (`findAllOpen`) has no date bound. An order created before midnight and still open is therefore occupied on `/tables` but absent from the listing — and because every route to the close action resolves through that listing, the table becomes unreachable: shown as occupied on both the waiter floor and the manager tables screen, with no UI path to close it, from the moment the day rolls over.

The absence of a written scope is what allowed the two queries to drift apart — each answered to nothing recorded, so their disagreement was invisible until it stranded a table.

## What Changes

- `GET /orders` returns the day's orders **plus** any order still in progress, regardless of the day it was created on. An order left open overnight keeps its table reachable and closable.
- The "still in progress" predicate is defined once and shared with the floor view's open-order query, so the listing and the floor cannot disagree again.
- The listing stays operational: it does not gain orders that were both created and completed on an earlier day. The financial record of a day is `/reports/daily-sales`, which keys on `closedAt`/`deliveredAt` and is unaffected.
- The change adds a requirement where none existed. No existing requirement's behaviour changes.

## Capabilities

### New Capabilities

- `orders/listing`: what the orders listing returns, what it deliberately excludes, and its relationship to the floor view's set of open orders.

### Modified Capabilities

- None.

## Impact

- `apps/api/src/orders/infrastructure/prisma-orders-repository.ts` — a shared open-order predicate beside the existing `completedWhere`; `findAllOpen` and `findAllForListing` both build on it, and `findAllForListing` widens to the union.
- `apps/api/src/orders/application/use-cases/list-orders.ts` — its doc comment ("List the day's orders") becomes false and is corrected.
- `apps/api/src/orders/infrastructure/prisma-orders-repository.spec.ts` — regression cases for the widened set and for the exclusions.
- No schema, migration, DTO, route or response-shape change. The repository interface signature is unchanged, so the specs that stub it need no edits.
- `findDaySales` and `findCompleted` (the reports) are untouched, and a guard case keeps them so.
- Known follow-up, deliberately outside this change: `apps/web/src/pages/manager/pages/delivery/delivery-page.tsx` carries a comment asserting "GET /orders returns only today's orders" and an empty state reading "Nenhum pedido de entrega hoje." Both become inaccurate once the listing widens.
