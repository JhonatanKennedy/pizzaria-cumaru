## Why

Orders cannot be created over HTTP at all — the queue and status flows are only testable with hand-seeded rows. The table-order and delivery-order features (03/04) and the waiter/manager creation scenarios (05/07) require the real creation path: local orders per table, delivery orders with address, and items added over the course of service.

## What Changes

- **Create local order** — `POST /orders` with `{ type: "Local", tableId }` creates one open order linked to the table and recording the creating user. A table SHALL have at most one open order; a second creation attempt is refused.
- **Create delivery order** — `POST /orders` with `{ type: "Delivery", customerName, phone?, address }`; a missing address is refused with "Delivery address is required for delivery". The order is not linked to any table.
- **Add items** — `POST /orders/:orderId/items` with `{ itemId, quantity?, flavors?, notes? }`; the unit price is snapshotted from the current catalog price at add time; a split pizza (two flavors) records the flavors and is priced at the **highest flavor price** (product decision); observations are recorded on the item; a closed order refuses new items with "Cannot change a closed order"; an item whose required ingredients are unavailable is refused (availability rule from 02/05).
- **Domain shape** — `Order` gains delivery fields (`customerName`, `phone?`, `address?`); `OrderItems` gains `flavors` and `notes`; `paymentType` becomes optional at creation (it is set when the order closes — the checkout change).
- **Persistence** — schema columns for the new fields (second migration); repository additions: `findOpenByTableId`, `save` already exists; catalog repository gains `findItemById` (price/flavor lookup) and ingredient availability reads for the add-item check.

## Capabilities

### New Capabilities

- `orders/order-creation`: creating local and delivery orders, adding items, flavor pricing, observations, and the closed-order/unavailable-item refusals.

### Modified Capabilities

None — `openspec/specs/` is still empty; the kitchen change's specs have not been synced yet (sync is tracked separately).

## Impact

- `src/orders/domain` — `Order` delivery fields + optional `paymentType`, `OrderItems` flavors/notes.
- `src/orders/application` — `create-order` and `add-item-to-order` implemented (plus a delivery creation path).
- `src/orders/presentation` — real `POST /orders`, `POST /orders/:orderId/items` replacing the stubs; DTOs with validation decorators (error-handling change has landed first).
- `src/prisma/schema.prisma` + migration; mappers updated.
- `src/catalog/domain/repositories/catalog-repository.ts` — `findItemById` added.
- Full e2e journeys become possible: create → add → kitchen queue.

**Prerequisite**: `http-error-handling` applied first (DTOs ship decorated; refusals surface as 400).
**Out of scope**: closing/payment (orders-checkout), delivery status cycle (delivery-order-status), roles (applied last).
