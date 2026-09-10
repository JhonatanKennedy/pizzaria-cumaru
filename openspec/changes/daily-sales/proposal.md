## Why

The earnings report answers "how much came in today" but not "which sales made it up" — the manager's new "Vendas do Dia" screen (frontend companion change, `pizzaria-cumaru-frontend`) needs the day's completed sales, each with its responsible waiter, payment method, sale time, total, and items. All of that data already sits on the `Order` rows (`paymentType`, `closedAt`, `deliveredAt`) and in the existing listing join (waiter names, items) — no endpoint exposes it as the completed population.

## What Changes

- **Day sales listing** — new manager-only `GET /reports/daily-sales` returns the day's sales: local orders with status `Closed` and delivery orders with status `Delivered`, the exact population the earnings report sums (`findCompleted`), so the two views agree by construction. Each sale carries `id`, `waiterName`, `type`, `status`, `paymentType` (always null for delivery — only local orders close with a payment method, per the checkout spec), `closedAt` / `deliveredAt` (the sale time: closed for local, delivered for delivery), `createdAt`, `totalPrice`, and `items` (`id`, `itemId`, `quantity`, `status`) shaped like the day's order listing.
- No query filters on the endpoint — the day's completed set is small and the frontend filters it client-side (order type, payment method, item category via the catalog join). Server-side filters return only if the payload outgrows that.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orders/checkout`: new requirement — the day's sales listing (the completed population with waiter, payment method, sale time, total, and items).

## Impact

- `src/orders/domain` — `Order` accessors for `paymentType` / `closedAt` / `deliveredAt` if not already exposed; no entity behavior changes.
- `src/orders/application` — new `list-day-sales` use case mapping the completed-in-day query to the listing shape.
- `src/orders/presentation` — `GET /reports/daily-sales` on `ReportsController` (Manager-only, same guard as `daily-earnings`).
- `src/orders/infrastructure` — repository method for the day's completed sales with waiter names, payment fields, and items; mapper updates.
- `src/orders/application` + `infrastructure` specs — unit tests for the use case and the repository query.
- `features/07_manager_profile.feature` — a scenario tracing the day's sales listing, to keep the "endpoints trace back to scenarios" rule (pending check of the local copy).
- No migration: `paymentType`, `closedAt`, `deliveredAt` columns already exist.

**Prerequisites**: none (builds on the persisted checkout/listing state).
**Out of scope**: delivery payment flows (only local orders close with payment — existing spec), category/name enrichment (the frontend joins the shared catalog), earnings by payment method, e2e journeys beyond the existing suite unless the scenario addition calls for one.
