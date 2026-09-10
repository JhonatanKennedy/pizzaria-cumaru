## Context

The orders context already reads the day's orders two ways: `PrismaOrdersRepository.findCompleted(day)` — the closed/delivered population with the day boundary on `closedAt`/`deliveredAt`, feeding the earnings totals — and `findAllForListing(day)`, which maps rows to `IOrderListingEntry { order, waiterName }` (waiter names resolved through a separate `user.findMany` map). The `Order` aggregate already exposes `getPaymentType()`, `getClosedAt()`, `getDeliveredAt()`, and the mappers round-trip all three. What is missing is a read that combines the two: the completed population with waiter attribution and payment fields. See proposal.md — Why for motivation, and the delta spec for the behavior.

## Goals / Non-Goals

**Goals:**
- A manager-only read of the day's sales with waiter, payment method, sale time, total, and items.
- The sales population stays definitionally identical to the earnings population.

**Non-Goals:**
- Query filters on the endpoint (the frontend filters the small day payload client-side — type, payment method, category via its catalog join).
- Earnings by payment method, delivery payment flows, item name/category enrichment (client concern).

## Decisions

**1. A dedicated repository method, sharing the completion predicate with `findCompleted`.**
`findDaySales(day): Promise<IOrderListingEntry[]>` adds rows in the completed window and resolves waiter names exactly like `findAllForListing`. The `Closed`/`Delivered` OR-where is extracted into a private `completedWhere(start, end)` helper used by both `findCompleted` and `findDaySales`, so the earnings report and the sales listing can never drift apart. Status alone distinguishes the populations (`Closed` is local-only, `Delivered` delivery-only — the checkout spec forbids closing deliveries). Alternatives: extending `findCompleted` to always join users — rejected, the earnings path would pay a user query it never uses; a controller-side merge of `findAllForListing` + status filter — rejected, the created-day boundary differs from the closed/delivered-day boundary and cancelled/open rows would need re-filtering.

**2. A `list-day-sales` use case mirroring `list-orders`.**
Maps `IOrderListingEntry[]` to sale rows: the listing shape (id, waiterName, type, status, tableId, createdAt, totalPrice, items) plus `paymentType`, `closedAt`, `deliveredAt` — `Date | null` / string-typed like `IOrderListingOrder`, serialized to ISO by Nest. Items stay `{ id, itemId, quantity, status }`; names and categories are the client's catalog join (as the waiter screen already does).

**3. No query parameters on `GET /reports/daily-sales`.**
Daily-earnings filters server-side because the backend zeroes subtotals per filter; a sales list has no such semantic — one fetch, client-side chips, one query key. Filters return to the endpoint if the payload ever outgrows a day.

**4. Server rows stay `createdAt`-ascending; the client orders by sale time.**
`closedAt` (local) and `deliveredAt` (delivery) are different fields on different rows, so a single server-side "sale time" ordering would need a computed key. Deterministic `createdAt asc` (as `findAllForListing`) keeps tests repeatable; the frontend sorts by `closedAt ?? deliveredAt` descending for display.

**5. Manager-only guard, no DTO.**
`@Roles({ roles: [EUserRole.MANAGER] })` on the new `ReportsController` route, same as `daily-earnings`; a GET with no body needs no DTO and route params/query are unvalidated by design (backend rule 01).

## Risks / Trade-offs

- [Waiter-resolution query runs per sales read] → bounded: one `user.findMany` over the day's rows, same cost profile as the existing listing.
- [Null `paymentType` on delivery sales reads as a gap] → spec'd behavior: deliveries never close; the client renders a dash and excludes them from payment-filtered views.
- [Population drift if a future flow closes deliveries] → both reads share `completedWhere`; a change lands in the earnings totals and the sales listing together, and the checkout spec is updated in the same change.

## Open Questions

None — remaining unknowns (client layout, labels, catalog join details) live on the frontend side and cannot change this spec.
