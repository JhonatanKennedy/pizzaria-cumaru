## Context

`EOrderStatus` is `{ Open, Closed }` for all orders; the delivery feature requires an order-level cycle for delivery orders only. Item-level statuses (Pending/Preparing/Ready) already exist and are orthogonal — this change is about the *order*, not its items. The status column is a String, so enum extension needs no schema migration; only `deliveredAt` is new. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- A strictly sequential, delivery-only order cycle with a recorded delivery time.
- Kitchen queue keeps showing in-cycle delivery orders while their items are still being prepared.

**Non-Goals:**

- Delivery payment/closing (no feature defines it — "Delivered" is terminal for now).
- Driver assignment, dispatch logistics.

## Decisions

### D1. Extend `EOrderStatus` — single axis, type-guarded

`EOrderStatus` gains `PREPARING = 'Preparing'`, `OUT_FOR_DELIVERY = 'Out for delivery'`, `DELIVERED = 'Delivered'`. Transitions are guarded by order type. Alternative considered: a separate `EDeliveryOrderStatus` field on the order — rejected; two overlapping status axes would double the invariant surface and confuse the earnings report's "completed delivery" query.

### D2. Transition methods on `Order`

| Method | From | To | Guards |
| --- | --- | --- | --- |
| `startDeliveryPreparation()` | Open | Preparing | type DELIVERY, else `'Only delivery orders can enter the delivery cycle'` |
| `sendOutForDelivery()` | Preparing | Out for delivery | same type guard + sequential |
| `markDelivered(deliveredAt)` | Out for delivery | Delivered | same; records `deliveredAt` |

Any wrong-step/repeat/backwards attempt throws `'Invalid delivery status transition'`. The existing `close()` is untouched (checkout change defines its endpoint behavior; delivery orders are not closed by any feature).

### D3. `deliveredAt` on `Order`

Optional field, set by `markDelivered` with the caller-supplied timestamp (same injected-clock convention as `createdAt`). Mapper round-trips it; column nullable.

### D4. Queue repository widening

`findAllOpen` becomes "orders visible to the kitchen queue": local orders with status `Open`, delivery orders with status in (`Open`, `Preparing`, `Out for delivery`). The queue's item-level filtering (PENDING/PREPARING + stock) already governs what is *shown*, so a delivery order mid-cycle with no pending items renders as an empty order and is dropped by the projection's existing filter.

### D5. Endpoint

`PATCH /orders/:orderId/status` with `{ status: "Preparing" | "Out for delivery" | "Delivered" }`, mapping to the three methods via the `update-delivery-order-status` stub (implemented). `Delivered` has no body timestamp — the use-case supplies the clock.

### D6. Persistence

Migration adds `Order.deliveredAt DateTime?`. The mapper's existing enum parsers pick up the new status values automatically (they validate against `Object.values(EOrderStatus)`).

## Risks / Trade-offs

- [Widened `findAllOpen` name no longer matches its semantics] → Renamed concern is documented in D4; the method keeps its name to avoid churn, with an updated doc comment.
- [Item and order both use the word "Preparing"] → Two enums, two axes; the docs in both specs make the level explicit. Accepted.

## Open Questions

None.
