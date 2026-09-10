## Why

`/manager/delivery` is a placeholder, yet `features/04_delivery_order.feature` promises the full flow: delivery orders received by WhatsApp — customer name, phone and address, items with flavors and notes, and a status cycle `Open → Preparing → Out for delivery → Delivered`. Product decision (recorded in the routes docs): the delivery flow is manager-only in the SPA even though the Gherkin casts it in the waiter's hands. Two things block it: `GET /orders` does not expose `customerName`/`phone`/`address`/`deliveredAt` (a delivery order was indistinguishable from a table order beyond its type), and the SPA has no delivery surface at all.

## What Changes

- Sibling backend change: `GET /orders` exposes the delivery fields (`customerName`/`phone`/`address` as they are set, `deliveredAt` once delivered).
- A manager delivery list replaces the placeholder (`/manager/delivery`): today's delivery orders with customer, phone, status chip and total; loading/error/empty states; a "Novo pedido de entrega" button opening a create dialog (name, phone, address) that navigates to the new order on success.
- A delivery order detail (`/manager/delivery/:orderId`): customer header with phone/address, status chip, total; read-only item lines with status chips and per-line prices; a single advance action whose label always names the next step — "Iniciar preparo", "Saiu para entrega", "Marcar como entregue" — issuing `PATCH /orders/:orderId/status`; delivered orders show "Entregue às \<time\>" and no further actions; an add-items panel (category filters, availability gating, quantity/flavors/notes) only while the order is `Open`; `Pedido não encontrado.` for unknown ids.
- Create validation is deliberately client-free: empty name/address are rejected by the backend and its exact messages (`'Customer name is required for delivery'`, `'Delivery address is required for delivery'`) surface verbatim in the dialog.
- Waiter-order contracts become shared (second consumer): the orders listing contract moves to `src/api/orders.api.ts` with the delivery fields `.optional()` (Express drops undefined JSON keys — `waiterName` stays `.nullable()`); order labels and the enrich helper move to `src/lib/`; the waiter screens switch imports unchanged in behavior. `formatTime` (previously local to the manager sales card) moves to `src/lib/format.ts` for the delivery detail.

## Capabilities

### New Capabilities

- `manager-delivery-orders`: the manager's delivery flow — register a WhatsApp order with customer details, add items while it is open, and advance it step by step until it is delivered, with the delivered time recorded.

### Modified Capabilities

<!-- none — the waiter/order capabilities are unchanged in behavior; this change only moves their contracts to shared modules -->

## Impact

- Sibling backend: `src/orders/application/use-cases/list-orders.ts` maps the delivery fields; new colocated spec; delivery e2e asserts them.
- Hoists (no behavior change): `src/api/orders.api.ts` (shared listing contract + `listOrders`, `ORDERS_QUERY_KEY`), `src/lib/order-labels.ts`, `src/lib/order-enrich.ts`, `src/lib/format.ts` (`formatTime`); the waiter context's `api/orders.api.ts` keeps its mutations and imports the shared contract, and its screens import the shared helpers.
- `src/pages/manager/` — `business/delivery-status.ts` (cycle map + per-step action labels), `business/delivery-schemas.ts` (no-local-rules create form + add-item form), `api/delivery-orders.api.ts` (create/add/PATCH status), four hooks (`use-orders` with 15s polling, `use-menu`, `use-create-delivery-order`, `use-add-item`, `use-advance-delivery-status`), and the `pages/delivery/` screens with their parts (create dialog, order card, add-items panel) replacing the placeholder.
- `src/routes/router.tsx` — new `/manager/delivery/:orderId` route under the Manager `RequireRole`.
- Specs: six new colocated specs; fixtures across the suite updated for the shared contract.
