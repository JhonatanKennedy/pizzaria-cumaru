## Why

Once the kitchen starts a dish it is locked in a corridor with a single exit: `finish` to "Ready". Neither the cook nor the manager can stop it — the waiter's cancellation is refused for items "in preparation" (feature 09), and no kitchen-side verb exists. A wrongly-started dish, a customer who leaves mid-cooking, or a table dispute leaves the item stuck until it is cooked and charged.

## What Changes

- **Kitchen cancel action** — `POST /kitchen/orders/:orderId/items/:orderItemId/cancel` with `{ reason }`, available to **Cook and Manager**, cancels an item whose status is "Preparing". The item leaves the order (and the queue) and the reason is recorded in the order's cancellation history — the same observable outcome as the waiter's cancellation, minus the status restriction.
- **Domain transition** — `OrderItems` gains `cancelPreparation(reason)`: allowed only from "Preparing"; a new `Order.cancelPreparationItem` orchestrates removal + history alongside the existing `cancelItem`. The existing `cancel()` guard stays untouched, so a waiter cancelling an item in preparation keeps failing with "Cannot cancel an item in preparation" (feature 09 invariant preserved at the domain level, not by role).
- **Panel + permission surface** — the action is exposed on the kitchen queue routes (`kitchen-queue.controller.ts`), decorated with the same Cook/Manager role requirement as `start`/`finish`. A Waiter hitting the kitchen route is refused with the default "Access not authorized for your profile"; the waiter's own `/orders/.../cancellation` route is unchanged. The roles matrix comment in `roles.guard.ts` gains the new permission.
- **Read models** — nothing new: the queue drops the cancelled row (status no longer Pending/Preparing), waiter order views no longer show the item, order totals exclude it (same derivation as existing cancellations).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orders/order-item-status`: the item lifecycle gains a "Preparing" -> Cancelled (removed + history) transition, performed by the kitchen or the manager; the waiter restriction on cancelling an item in preparation is unchanged.
- `kitchen/kitchen-queue`: the panel gains a "cancel" action on rows that are "Preparing", refused for profiles without kitchen authority.

## Impact

- `src/orders/domain/entities/order-items.ts` — new `cancelPreparation(reason)` method (status must be "Preparing").
- `src/orders/domain/entities/orders.ts` — new orchestration method sharing the removal + history-recording path of `cancelItem`.
- `src/orders/application/use-cases/` — new `cancel-item-preparation.ts` use-case (mirrors `start-item-preparation` / `finish-item-preparation`), exported by `OrdersModule` like its siblings.
- `src/kitchen/presentation/controllers/kitchen-queue.controller.ts` — new `POST orders/:orderId/items/:orderItemId/cancel` route.
- `src/common/guards/roles.guard.ts` — permission matrix comment updated.
- Tests: unit spec on the new domain verb + use-case; e2e scenario in `test/order-status.e2e-spec.ts` (cook cancels one of two identical started dishes, the other stays; waiter still refused on the orders route).
- `features/06_cook_profile.feature` — scenario added.

**Prerequisites**: `kitchen-item-actions` (addressable rows + start/finish surface), `catalog-management` (roles/queue read models).
**Out of scope**: cancelling "Pending" rows from the kitchen (waiter route covers them), cancelling "Ready" items, reverting to "Pending" (un-start).

## Superseded

The `{ reason }` request body and the `cancelPreparation(reason)` signature described above were removed afterwards by `order-and-catalog-polish`, which dropped the `reason` column of `OrderCancellation`; the delta in `specs/` describes the shipped, reason-free confirmation.
