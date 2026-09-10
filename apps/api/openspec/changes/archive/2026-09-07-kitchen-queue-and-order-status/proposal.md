## Why

The kitchen panel and the item-preparation workflow exist only as commented stubs. The domain cannot model what the product specs require: `OrderItems.changeStatus()` is a raw setter with no transition rules, `Order` has no creation timestamp for arrival ordering, and cancelling an item has no way to record a reason. This change implements the item-status workflow and the kitchen queue that projects it, based on decisions locked during exploration.

## What Changes

- **`OrderItems` state machine** — replace the raw `changeStatus()` with explicit transition methods: `startPreparation()` (Pending → Preparing, invoked by cook or manager), `finishPreparation()` (Preparing → Ready, cook or manager), `cancel(reason)` (Pending only → item removed from the order, reason recorded in order history). Preparing is a **required** intermediate before Ready. All transitions enforce invariants and throw on invalid ones.
- **Timestamps** — `createdAt` on `Order` and on `OrderItems`, supplied by the caller (injected clock; the domain never reads the real clock).
- **Cancellation with history** — cancelled items are removed from the order regardless of reason; the order keeps a history of cancellations (item, reason, timestamp). Non-preparation items remain cancellable any time the order is open.
- **Kitchen queue projection** — `list-kitchen-queue` builds two queues (Delivery, Local) ordered by arrival, containing only items that `requiresPreparation`, hiding items whose ingredients are unavailable, and showing Preparing items as a badge in arrival order.
- **`finish-item-preparation` moves to `orders/application`** — kitchen becomes a read-only context; `start-item-preparation` is added alongside it in orders.
- **Persistence** — Prisma models and migrations for the aggregates these flows touch (orders, order items, catalog items, ingredients), with repository implementations and mappers. First real `migrations/`.
- **Cleanup** — delete `src/restaurant/` (byte-for-byte duplicate of catalog; catalog owns Item/Ingredient) and fix the `ingridients.ts` → `ingredients.ts` typo in catalog.
- **Spec edit** — add the start-preparation step to the cook-profile scenarios in `features/06_cook_profile.feature` (Preparing-required decision).

## Capabilities

### New Capabilities

- `orders/order-item-status`: the item preparation state machine (Pending → Preparing → Ready), cancellation rules and history, and creation timestamps.
- `kitchen/kitchen-queue`: the cook panel read model — two arrival-ordered queues, preparation-only items, stock-driven hiding, Preparing badge.

### Modified Capabilities

None — `openspec/specs/` is currently empty; these are the first capabilities.

## Impact

- `src/orders/domain` — `OrderItems` transition methods, `Order.cancelItem()` + history construct, `createdAt` params.
- `src/orders/application` — `finish-item-preparation` (moved from kitchen), new `start-item-preparation`, `cancel-item-from-order` implemented; repository implementations + mappers.
- `src/kitchen/application` — `list-kitchen-queue` implemented as a projection; kitchen keeps no domain layer.
- `src/catalog` — persistence for Item/Ingredient (stock-driven reads), typo fix.
- `src/prisma/schema.prisma` + new `migrations/`.
- `src/restaurant/` — deleted.
- `features/06_cook_profile.feature` — scenarios updated with the start step.
- **Prerequisite**: change `translate-features-to-english` must be applied first (tasks reference the English filenames).

**Out of scope** (recorded to avoid drift): the delivery-order status cycle (`04_delivery_order.feature`: Preparing → Out for delivery → Delivered), multi-flavor pizza pricing, order creation flows, and roles/authorization (separate change `user-roles-and-authorization`).
