## Why

Orders can now be created and prepared, but the money loop is missing: nothing closes an order with its payment method, the bill cannot be split, the daily earnings report does not exist, and the day's order listing does not show which waiter registered each order (07/09). The manager profile's core supervision features are all stubs.

## What Changes

- **Closing** — `POST /orders/:orderId/close` with `{ paymentType }` closes a local order: status → Closed, payment method recorded, total calculated from the items. The table becomes available again automatically (a new order for it can be created — the one-open-order invariant). Delivery orders are refused (their cycle ends at Delivered; no feature defines closing them). `Order.close()` gains the payment method and a `closedAt` timestamp.
- **Bill splitting** — the close request MAY include `splitInto` (number of equal parts); the response returns each part's value. Parts are computed, not persisted (no feature requires storing them).
- **Daily earnings report** — `GET /reports/daily-earnings` returns the day's totals: grand total, local total (closed local orders), delivery total (delivered delivery orders), with an optional `?type=` filter. Day membership is decided by `closedAt` / `deliveredAt`.
- **Day's order listing** — `GET /orders` returns the day's orders with their responsible waiter's name and item statuses (05: the waiter follows preparation; 07: the manager sees who registered each order).

## Capabilities

### New Capabilities

- `orders/checkout`: closing with payment, bill splitting, the daily earnings report, and the waiter-identified order listing.

### Modified Capabilities

None — main specs tree still empty (sync tracked separately).

## Impact

- `src/orders/domain` — `close(paymentType, closedAt)` replaces `close()`; `closedAt` and mutable `paymentType` on `Order`.
- `src/orders/application` — `close-order`, `get-daily-earnings-report`, `list-orders` stubs implemented.
- `src/orders/presentation` — `POST /orders/:orderId/close`, `GET /reports/daily-earnings`, real `GET /orders`.
- `src/orders/infrastructure` — `closedAt` column (fourth migration), mapper updates, repository methods for completed-in-day queries and waiter-name listings.
- `test/` — e2e for the full create → prepare → close → report journey.

**Prerequisites**: `http-error-handling`, `orders-creation`, `delivery-order-status` (the report counts Delivered orders).
**Out of scope**: roles (last change — the "only the manager closes" rule is enforced when guards land), delivery payment flows.
