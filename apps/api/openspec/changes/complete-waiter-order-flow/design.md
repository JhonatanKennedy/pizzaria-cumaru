# Design — complete waiter order flow

## Context

The order aggregate (see `orders.ts`) is a state machine over `EOrderStatus` (Open, Closed, plus the delivery cycle). Mutation verbs guard only against `Closed` ("Cannot change a closed order"). `OrderItems` already ships `increaseQuantity(n)` / `decreaseQuantity(n)` (refusing to go below one), but nothing calls them. `findAllOpen()` and `findOpenByTableId()` filter statuses explicitly (`Local`+`Open`, delivery-active), so any status outside those sets frees the table with zero changes to the tables module. Persistence is string-typed: `Order.status` is a plain `String` column in `schema.prisma`; the mapper parses it against a `Set` built from `Object.values(EOrderStatus)` — adding an enum member flows through automatically. `Order.cancellations` (per-item rows) is the only history table today.

Decided with the user: the waiter's whole responsibility is one order per table, cancel items/order, adjust quantities. Order cancellation cascades over every item whatever its status (option B — a customer who gives up leaves no hostage); a reason is required; quantity adjustment is allowed while an item is "Preparing" (the kitchen reads current state). Delivery stays manager-only; delivery-order cancellation is out of scope.

## Goals / Non-Goals

**Goals**
- Give Waiter and Manager two missing verbs: cancel a whole open table order; set an item's quantity.
- Model whole-order cancellation as an order-level transition with its own reason and time, so even a zero-item order can be cancelled with the reason preserved.
- Free the table by status semantics alone — no tables-module changes.
- Keep per-item cancellation and its history semantics exactly as they are (feature 09 unchanged for single items).

**Non-Goals**
- No delivery-order cancellation (feature 04 defines no such flow; delivery stays manager-only).
- No merge-on-add: adding the same item twice still creates a second line; quantity adjustment is the way to make one line grow. (Product accepted: "update = quantity or add more"; add-more already exists.)
- No kitchen-side awareness work: items leave the queue because the queue reads live order items (same observable as waiter item cancellation today).
- No UI history display: nothing renders `cancellations` today; the recording is for the audit trail.

## Decisions

### 1. `Cancelled` as a new order status, not a removal
The aggregate keeps the order row (status "Cancelled") instead of deleting it: the row carries the reason/time, the daily queries (`findAllOpen`, `findOpenByTableId`, `findCompleted`) already exclude it, and `findAllForListing` keeps showing the day's history for the waiter/manager views. Deleting would orphan per-item data and break "one open order per table" bookkeeping.

### 2. `Order.cancelOrder(reason, cancelledAt)` — order-level verb, cascade inside the aggregate
Atomicity and invariants live in one place (single `save()`):
- blank reason -> "Cancellation reason is required" (same message as item cancellation);
- `Closed` -> "Cannot change a closed order" (existing message);
- any other non-open status -> "Only open orders can be cancelled";
- otherwise: clear every remaining item (bypassing the per-item guards, which legitimately refuse "Preparing"/"Ready" — this is the cascade), store `cancellationReason`/`cancelledAt`, set status `Cancelled`.

Why order-level fields instead of per-item history rows: a whole-order cancellation is one event; N per-item rows would duplicate the reason N times and a zero-item order would lose it entirely. The two nullable columns are additive (string-status DB needs no other change). Item cancellations keep their per-item rows — the two histories do not mix.

### 3. Frozen-cancelled guard sweep
Every item-mutating verb (`addItem`, `cancelItem`, `cancelPreparationItem`, quantity change) gains a `Cancelled` guard alongside the `Closed` one, with the parallel message "Cannot change a cancelled order" (feature-spec asserted). `close()` gains "Cannot close a cancelled order" — reachable only through a raw API call (manager close screens list open orders only), kept for invariant hygiene.

### 4. Quantity: absolute target over `PATCH`, diffed onto the existing delta verbs
`PATCH /orders/:orderId/items/:orderItemId/quantity` with `{ quantity }` (absolute, `@IsInt` + `@Min(1)` in a new DTO). The use-case finds the order ("Order not found"), applies the frozen guards, finds the item ("Item not found"), computes `target - current`, and delegates to `increaseQuantity`/`decreaseQuantity` — no new domain methods, no status restriction (product decision). `@Min(1)` makes the domain "less than one" message unreachable through this endpoint (the spec says only "the system refuses" for quantity 0). A no-op request (`target === current`) saves nothing.

### 5. Route shape and permissions
`POST /orders/:orderId/cancellation` mirrors the item route's `/cancellation` noun and the close route's shape; `PATCH .../quantity` mirrors the existing `@Patch(':orderId/status')` precedent. Both are decorated `@Roles({ roles: [WAITER, MANAGER] })`, same as `POST /`, `POST :orderId/items` and the item cancellation route; the matrix comment in `roles.guard.ts` gains both lines.

### 6. Persistence and mapper
`schema.prisma` gains `cancelledReason String?` and `cancelledAt DateTime?` on `Order`; regenerate the client (`src/prisma/generated`) and apply to the dev DB. The mapper's `orderRowToDomain` passes the two fields to `Order.restore`; `orderDomainToCreate/Update` write them back. `status` needs no column work.

## Risks / Trade-offs

- [Waiter cancels the wrong table's order] -> Blast radius is the whole order; the confirm step on the client must show the table number and the reason is required. Same exposure class as item cancellation, one step wider.
- [Cancelling overrides the "Preparing/Ready items are protected" invariant] -> Intentional and product-decided (option B: the customer who gave up must not keep the kitchen busy); the order-level reason is the audit trail. Per-item cancellation rules are untouched for single items.
- [Two history shapes (per-item rows vs order-level columns)] -> They answer different questions (what left the order and why / why the whole order was voided); documented in decision 2, both read by the same order row.
- [Adding a status value widens every status `Set`/parse automatically] -> Desired: `parseOrderStatus` accepts `Cancelled` out of the box; `findCompleted` (Closed/Delivered) is unaffected so cancelled orders never reach the daily-earnings totals.

## Migration Plan

Additive: `cancelledReason`/`cancelledAt` nullable columns; no data backfill, no seed changes, no renames. Deploy order irrelevant — new endpoint + new status value; existing orders keep their current statuses. Rollback: revert the schema columns, the domain verb and the routes; nothing existing depends on the new status.

## Open Questions

None — statuses, cascade semantics, reason requirement, quantity rules and permissions were decided with the user during exploration.
