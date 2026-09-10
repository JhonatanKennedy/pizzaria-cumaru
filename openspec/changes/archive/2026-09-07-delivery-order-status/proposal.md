## Why

Delivery orders have their own lifecycle, separate from item preparation: `04_delivery_order.feature` defines the order-level cycle Preparing → Out for delivery → Delivered, with the delivery time recorded on arrival. The domain has no concept of it — `EOrderStatus` only knows Open/Closed, and the `update-delivery-order-status` stub is unimplemented. The earnings report (orders-checkout, next) counts "delivered" delivery orders, so this cycle must exist first.

## What Changes

- **Order-level delivery cycle** — `EOrderStatus` gains `Preparing`, `Out for delivery`, and `Delivered` (delivery-only values). `Order` gains type-guarded transition methods: `startDeliveryPreparation()`, `sendOutForDelivery()`, `markDelivered(deliveredAt)`. Transitions are strictly sequential; skipping a step or advancing a delivered order is refused; local orders are refused from the cycle entirely.
- **Delivery time** — `deliveredAt` is recorded on the order when it becomes Delivered.
- **Queue visibility** — `findAllOpen` widens so delivery orders in the cycle (Preparing / Out for delivery) keep appearing in the kitchen queue while their items are still pending; item-level filtering continues to govern what is shown.
- **Endpoint** — `PATCH /orders/:orderId/status` with `{ status }` maps to the three transitions (`update-delivery-order-status` stub, implemented).
- **Persistence** — `Order.deliveredAt` column (third migration); the status column already stores strings, so the enum extension needs no schema change.

## Capabilities

### New Capabilities

- `orders/delivery-status`: the order-level delivery lifecycle, its transition rules, and the delivery timestamp.

### Modified Capabilities

None — main specs tree still empty (sync tracked separately).

## Impact

- `src/orders/domain` — enum extension, transition methods, `deliveredAt`; unit tests for every transition and refusal.
- `src/orders/application` — `update-delivery-order-status` implemented.
- `src/orders/presentation` — `PATCH /orders/:orderId/status`.
- `src/orders/infrastructure` — mapper round-trips `deliveredAt`; repository `findAllOpen` includes in-cycle delivery orders.
- `src/prisma/schema.prisma` + migration.

**Prerequisites**: `http-error-handling`, `orders-creation` (delivery orders exist to advance).
**Out of scope**: payment/closing of delivery orders (no feature defines it — Delivered is terminal), roles (last change).
