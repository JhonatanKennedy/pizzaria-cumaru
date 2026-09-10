## Why

The waiter's job on the floor is: open one order per table, add items over the service, and undo mistakes — cancel items and, when a customer gives up or leaves, cancel the whole order and make the table available again. Two of those verbs do not exist. A table whose client leaves is stuck occupied until the manager closes the order with a payment; and a mis-typed quantity (10 drinks instead of 2) cannot be corrected — the domain already ships `increaseQuantity` / `decreaseQuantity`, but no use-case or endpoint exposes them.

## What Changes

- **Cancel a table order** — `POST /orders/:orderId/cancellation` with `{ reason }`, available to **Waiter and Manager**. A new `Cancelled` value joins `EOrderStatus`. The order aggregate gains `cancelOrder(reason, cancelledAt)`: reason required, refuses closed orders ("Cannot change a closed order") and orders not open ("Only open orders can be cancelled"). The cancellation **cascades**: every remaining item leaves the order regardless of its preparation status — including items "Preparing"/"Ready" — so kitchen queues drop them, and each item keeps no trace beyond the order-level cancellation record (new nullable `cancelledReason` / `cancelledAt` columns on the order). Table occupancy queries (`findAllOpen`, `findOpenByTableId`) filter on "Open"/delivery-active statuses, so a cancelled order **frees the table automatically** and a new order can be opened for it.
- **Frozen cancelled orders** — the item-mutating verbs (`addItem`, `cancelItem`, `cancelPreparationItem`, quantity changes) refuse on a cancelled order with "Cannot change a cancelled order", mirroring the existing closed-order guard.
- **Adjust item quantity** — `PATCH /orders/:orderId/items/:orderItemId/quantity` with `{ quantity }` (absolute target, integer >= 1), available to **Waiter and Manager**. The use-case computes the delta against the current quantity and delegates to the existing `increaseQuantity` / `decreaseQuantity` domain verbs, which already refuse going below one. Adjustment is allowed while an item is "Preparing" — the kitchen sees the updated quantity on its next read (product decision: no status restriction, same autonomy as order cancellation). Closed or cancelled orders refuse with the guards above.
- **Role matrix + feature specs** — the two routes join the permission matrix comment in `roles.guard.ts` (Waiter, Manager). Scenarios are added to `features/03_table_order.feature` (quantity adjustments), `features/09_cancellation_and_payment.feature` (whole-order cancellation) and `features/10_table_management.feature` (table frees after cancellation).
- **Persistence** — additive schema change: `Order.cancelledReason` / `Order.cancelledAt` nullable columns; `status` is a plain string column, so the new value needs no column change.

## Capabilities

### New Capabilities

- `orders/order-cancellation`: cancelling a whole table order — cascade over items of any preparation status, order-level reason and time recorded, table freed for a new order, cancelled orders frozen against further changes.
- `orders/order-item-quantity`: adjusting the quantity of an order item while the order is open, regardless of the item's preparation status, never below one, refused on closed or cancelled orders.

### Modified Capabilities

None — the two new capabilities own their behavior; existing specs are untouched (per-item cancellation rules and delivery statuses keep their exact scope).

## Impact

- `src/orders/domain/enums/order-status.ts` — `CANCELLED = 'Cancelled'` member.
- `src/orders/domain/entities/orders.ts` — new `cancelOrder(reason, cancelledAt)`; item verbs guard on `Cancelled` alongside `Closed`; `cancelledReason`/`cancelledAt` restored/exported.
- `src/orders/application/use-cases/` — new `cancel-order.ts` and `update-order-item-quantity.ts`, exported by `OrdersModule` like their siblings.
- `src/orders/presentation/controllers/orders.controller.ts` — `POST :orderId/cancellation` and `PATCH :orderId/items/:itemId/quantity` routes; two small DTOs (reason reuse shape of `CancelItemDto`; quantity `@IsInt`/`@Min(1)`).
- `src/orders/infrastructure/` — mapper gains the two new order fields (restore + update/create); no repository query changes (occupancy filters already exclude non-open statuses).
- `src/prisma/schema.prisma` + generated client — two nullable columns on `Order`, regenerate and apply to the dev database.
- `src/common/guards/roles.guard.ts` — permission matrix comment gains the two routes.
- Tests — unit specs on the two domain verbs, the two use-cases and the guard sweep; e2e coverage in `test/order-status.e2e-spec.ts`.
- `features/03_table_order.feature`, `features/09_cancellation_and_payment.feature`, `features/10_table_management.feature` — scenarios added (mirrored in the frontend repo).

**Out of scope**: cancelling delivery orders (manager flow, feature 04 defines no cancellation), an order-level reason on per-item cancellations (existing history semantics unchanged), merge-on-add ("add more" stays a separate item line; quantity adjust is the merging fix).
