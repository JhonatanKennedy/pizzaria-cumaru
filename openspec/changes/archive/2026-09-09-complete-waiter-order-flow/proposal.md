## Why

The waiter's two residual floor verbs are missing from the UI: when a customer gives up, the waiter cannot cancel the whole order — the table stays occupied until the manager closes it with a payment — and a mis-typed quantity (10 drinks instead of 2) cannot be corrected on the order detail. The backend companion change (`complete-waiter-order-flow`, same name) exposes `POST /orders/:orderId/cancellation` and `PATCH /orders/:orderId/items/:orderItemId/quantity`; this change consumes them on the waiter's order detail screen.

## What Changes

- **Cancel an open table order** — the order detail header gains a "Cancelar pedido" action while the order is "Aberta". It opens a reason dialog modeled on the existing `CancelItemDialog` (Motivo required, pt-BR "Motivo é obrigatório"); on success the waiter is sent back to `/waiter/tables`, where the freed table shows without an open order. Backend errors (e.g. a concurrent close) surface verbatim via `toErrorMessage`.
- **Cancelled orders render read-only** — "Cancelled" joins `ORDER_STATUS_LABELS` as "Cancelado". A cancelled order (reached by deep link while it is still listed for the day) shows the badge, an empty-items notice, and no add/cancel/quantity actions — the backend removes every item on cancellation, so the total reads zero.
- **Adjust item quantity** — each item row on the open-order detail gains a `+`/`−` stepper (the `−` is disabled at quantity 1; below one is the cancel-item flow). A press issues `PATCH .../quantity` with the new absolute quantity; the orders query invalidates and the row/total refresh. Adjustment stays available while an item is in preparation (the kitchen reads current state — product decision); refusals from closed/cancelled orders show the backend message verbatim.
- **API and hooks** — `orders.api.ts` gains `cancelOrder(orderId, reason)` and `updateOrderItemQuantity(orderId, orderItemId, quantity)`; new `use-cancel-order` and `use-update-item-quantity` mutations invalidate `['orders']` (cancel also invalidates `TABLES_QUERY_KEY` so the floor refreshes immediately).
- **Components** — `CancelOrderDialog` (reason form, modeled on `CancelItemDialog`) and `QuantityStepper` (two-button stepper with pt-BR accessible labels), each with colocated specs. No route or role changes: the detail is already `Waiter, Manager`.
- **Feature specs + rules sync** — the mirrored `features/03_table_order.feature`, `features/09_cancellation_and_payment.feature` and `features/10_table_management.feature` gain the same scenarios as the backend change; `.claude/rules/01-project-context.md` updates the waiter-flow status notes.

## Capabilities

### New Capabilities

None — this is the same capability the waiter's screens already implement.

### Modified Capabilities

- `waiter-table-orders`: the detail screen gains two verbs — cancelling the whole open order with a required reason, and adjusting an item's quantity while the order is open — plus the read-only rendering of cancelled orders.

## Impact

- `src/api/orders.api.ts` — two new functions against the new backend routes (responses validated as today: both return `void`-ish shapes; no schema additions beyond nothing — the endpoints return no body).
- `src/pages/waiter/business/labels.ts` — `ORDER_STATUS_LABELS` gains `Cancelled: 'Cancelado'`; `labels.spec.ts` updated.
- `src/pages/waiter/hooks/` — `use-cancel-order.ts`, `use-update-item-quantity.ts` (invalidate `['orders']`; cancel also invalidates `TABLES_QUERY_KEY`).
- `src/pages/waiter/components/` — `CancelOrderDialog/index.tsx` (+ spec), `QuantityStepper/index.tsx` (+ spec).
- `src/pages/waiter/pages/order-detail.tsx` — cancel action + dialog wiring, per-row steppers, read-only cancelled state, error banner, post-cancel navigation to the floor.
- `features/03_table_order.feature`, `features/09_cancellation_and_payment.feature`, `features/10_table_management.feature` — scenarios mirrored from the backend change.
- `.claude/rules/01-project-context.md` — waiter-flow mapping notes updated.
- Backend: no changes (the companion change ships the endpoints).

**Out of scope**: showing cancellation history (no screen renders it today), delivery orders (manager-only), optimistic updates (mutations invalidate; refetch on window focus covers cross-device changes).
