## Context

Today `OrderItems.changeStatus()` is a raw setter (any status, no invariants), `Order` has no timestamp, getters, or cancellation history, and the kitchen context holds two commented stubs. Nothing is persisted — the Prisma schema has only a `User` model and `migrations/` doesn't exist. `src/restaurant/` is a byte-for-byte duplicate of `src/catalog/`. See proposal.md for motivation. Prerequisite: change `translate-features-to-english` is applied first, so this change references `06_cook_profile.feature`, `09_cancellation_and_payment.feature`, etc.

## Goals / Non-Goals

**Goals:**

- Pure, unit-testable transition rules on the orders aggregates (the domain rules from 06 and 09 live in `domain/`, per the project's testing pyramid).
- A kitchen context that is read-only: a projection with no domain layer.
- First persistence slice: Prisma models + migrations + repository implementations for the aggregates these flows touch.

**Non-Goals:**

- Delivery-order status cycle (`04_delivery_order.feature`: Preparing → Out for delivery → Delivered) — separate axis, separate change.
- Multi-flavor pizza pricing, order-item observations, order creation flows.
- Roles/authorization — change `user-roles-and-authorization` owns who may invoke; this change only defines what the transitions are.
- E2e journeys that require order-creation endpoints (out of scope here; see Risks).

## Decisions

### D1. Transition methods replace the setter

`OrderItems.changeStatus()` is removed. Three explicit methods enforce the machine:

| Method | From | To | Invalid input |
| --- | --- | --- | --- |
| `startPreparation()` | `Pending` | `Preparing` | throw `'Item is not waiting for preparation'` |
| `finishPreparation()` | `Preparing` | `Ready` | throw `'Item is not in preparation'` |
| `cancel(reason)` | `Pending` | removed from order + history | throw `'Cannot cancel an item in preparation'`; empty reason throws `'Cancellation reason is required'` |

All rules are unit-tested on the aggregates (per `02-testing.md`), not over HTTP.

### D2. `requiresPreparation` snapshot on the item

`OrderItems` gains a `requiresPreparation` boolean captured at creation from the catalog item. Items that don't require preparation get **no status** (`status?` optional) — per 02: they "never enter the kitchen flow" and generate no preparation status. Cancellation rules read the flag locally: prepared items cancel only while `Pending`; non-prepared items cancel any time while the order is open.

Alternative considered: join the catalog at cancellation time to learn the flag — rejected; it makes a business rule depend on another aggregate's read and is not unit-testable in isolation. Trade-off: a catalog change to an item's preparation flag applies to new orders only; acceptable, since the item's behavior is decided when it is added.

### D3. Cancellation = removal + history entry

`Order.cancelItem(itemId, reason)` removes the item from the order's items and appends a history entry `{ itemId, reason, cancelledAt }`. The `CANCELLED` enum value stays (it describes what happened in history/display vocabulary) but no removed item keeps a live status.

### D4. Caller-supplied clock

`TCreateOrderParams` and `CreateOrderItemParams` gain `createdAt: Date`, supplied by the application layer. The domain never calls `new Date()` — per the repeatability rule, the factory accepts the clock.

### D5. Kitchen is a projection; commands live in orders

- `finish-item-preparation` and the new `start-item-preparation` use-cases live in `orders/application`; the kitchen stub is deleted.
- `list-kitchen-queue` (kitchen/application) reads through the **orders repository** and **catalog repository** interfaces and assembles the two queues. Kitchen declares no `domain/` layer of its own.
- REST shape follows the project's own sketch: `PATCH /orders/:orderId/items/:itemId/status` with body `{ status: "Preparing" | "Ready" }` (mapped to start/finish), and `POST /orders/:orderId/items/:itemId/cancellation` with body `{ reason }`. Kitchen exposes `GET /kitchen/queue`.

### D6. Persistence slice

New Prisma models (first `npx prisma migrate dev` run): `Order` (id, userId, type, status, paymentType, tableId?, notes?, createdAt), `OrderItem` (id, orderId, itemId, unitPrice, quantity, status?, requiresPreparation, createdAt), `Item` (id, name, price, category, requiresPreparation), `Ingredient` (id, name, inStock), plus the `Item`↔`Ingredient` relation. Repository implementations live outside `domain/` (per rules) with mappers between aggregates and rows. Integration tests run against the dedicated test database.

### D7. Cleanup

Delete `src/restaurant/` (nothing unique; no module wires it). Rename `src/catalog/domain/entities/ingridients.ts` → `ingredients.ts` and update imports. Verify with `npm run build`.

### D8. Spec edit

In the translated `features/06_cook_profile.feature`, the two confirm-finished scenarios gain a start-preparation step in the Given, matching the Preparing-required decision.

### D9. Assumption — Ready items leave the queue

The features never state what happens to a "Ready" item on the panel. The kitchen spec assumes finished items leave the queue ("only items to prepare are shown"). If the product owner wants finished items to linger with a "Ready" badge, the kitchen spec's last requirement changes — flagged, not a blocker.

## Risks / Trade-offs

- [Stale `requiresPreparation` snapshot] → Behavior is decided at add time; catalog changes affect new orders only. Documented in D2.
- [Optional status invites null-handling bugs] → `strict` TypeScript; transitions assert on the optional; unit tests cover non-prepared cancellation.
- [Arrival ordering across two queues] → Both queues sort by `Order.createdAt`, then by `OrderItem.createdAt` within the order; timestamps come from the application clock, so ordering is deterministic in tests.
- [E2e blocked without order creation] → This change's e2e covers the status PATCH and queue GET against seeded rows; full create-order→kitchen journeys land with the order-creation change. Unit/integration tests carry the rules meanwhile.

## Open Questions

None — D9 is a flagged assumption, and all other decisions are locked.
