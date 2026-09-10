# Design — kitchen cancel preparation

## Context

The item lifecycle today (see `order-items.ts`): `startPreparation()` requires "Pending", `finishPreparation()` requires "Preparing", and `cancel(reason)` — the single cancellation guard used by `Order.cancelItem` — requires "Pending" for prepared items. The queue's only exits for a started dish are `finish` (kitchen-queue.controller) and the waiter's refused cancellation. See proposal.md — Why.

The permission surface for kitchen actions (`start`/`finish`) is already Cook + Manager via `@Roles` on the kitchen routes; `roles.guard.ts` carries the permission matrix comment that every endpoint must be listed in.

## Goals / Non-Goals

**Goals**
- Give Cook and Manager one kitchen-side verb that stops a "Preparing" item with a recorded reason.
- Keep the feature-09 invariant (waiter cannot cancel an item in preparation) enforced in the **domain**, not by role checks in the presentation layer.
- Reuse the existing cancellation observables: item removed from order, reason in `orderCancellation` history, totals derived from remaining items.

**Non-Goals**
- No "un-start" (Preparing -> Pending): a stopped dish leaves the order; the queue is not a hold queue. (Noted in proposal — Out of scope.)
- No cancelling "Ready" items (that is a close/payment-time concern) and no kitchen cancelling of "Pending" rows (waiter route covers them).
- No changes to the waiter's `/orders/:orderId/items/:itemId/cancellation` route or DTO.

## Decisions

### 1. New domain verb instead of loosening `cancel()`
`OrderItems.cancel()` is shared by every order-side cancellation. Loosening it to accept "Preparing" would move the feature-09 refusal into the use-case/route layer, where a future caller mistake silently widens waiter permissions. Instead:

- `OrderItems.cancelPreparation(reason: string): void` — requires a non-blank reason; requires status `PREPARING`; otherwise throws (e.g. `Cannot cancel an item not in preparation`). No status field change is needed: the item is removed from the aggregate, mirroring `cancel()`.
- `Order.cancelPreparationItem(itemId, reason, cancelledAt)` — closed-order guard, find-or-throw, item guard, removal + history push. The removal/history block is identical to `cancelItem`'s; extract a private `recordCancellation(item, reason, cancelledAt)` used by both, so history semantics cannot drift.
- Alternative considered: a `cancelledBy: 'kitchen' | 'order'` parameter on the existing methods — rejected as a boolean-trap style flag (per 03-javascript rule 9) and because the two verbs differ in which statuses they accept.

### 2. Preparing-only, mirroring the existing waiter guard placement
The domain method refuses anything but "Preparing" (a `Pending` item is waiter-cancellable; `Ready` is cooked). The refusal message mirrors the domain's user-facing style.

### 3. One use-case in `orders/application`, one route in the kitchen controller
The start/finish precedent: transitions live in `orders/application` (they mutate the orders aggregate through `ORDERS_REPOSITORY`), and the kitchen controller imports the exported use-cases from `OrdersModule`. Follow it: `cancel-item-preparation.ts` with `{ orderId, itemId, reason }`, find order -> find item by order-item id (addressable rows per the queue spec) -> `order.cancelPreparationItem(...)` with the clock injected at the call site (new Date) -> save.

### 4. Route shape and permission
`POST /kitchen/orders/:orderId/items/:orderItemId/cancel` — third verb in the start/finish series, same `@Roles({ roles: [COOK, MANAGER] })`. The noun-style `/cancellation` route stays on the orders side (waiter). The two routes differ by actor+status; keeping both visible in the path (kitchen prefix) makes the permission boundary self-documenting.
- Reason arrives in the body: reuse `CancelItemDto`'s shape (`{ reason }`, required, class-validator `@IsString`/`@IsNotEmpty` — it is already validated) via a new small DTO or the existing one if importable across controllers; prefer the existing `CancelItemDto`.
- Roles guard: no code change beyond the matrix comment in `roles.guard.ts` (add "cancel preparation — Cook, Manager").
- Waiter on this route: default `403` "Access not authorized for your profile" (existing guard behavior).

### 5. Persistence
No schema change. `Order.cancelPreparationItem` produces the same end state the repository already persists (`cancelItem` today): item row removed from `orderItem` (the mapper writes the aggregate's item list), `orderCancellation` row created. Verify `PrismaOrdersRepository.save` handles a full-item-removal save identically to the waiter cancellation path (it must — it already persists waiter cancellations); if mapper internals differ per method, reuse the same repository call as `cancelItem`.

## Risks / Trade-offs

- [Cook cancels a dish the customer still wants (mistap)] -> Same blast radius as `finish`; the action removes the dish from the order so the customer is not charged — a manager can re-add it (`POST /orders/:orderId/items`). Consider a confirm step on the client.
- [Silent duplicate history shapes: two domain verbs, one repository write path] -> Shared private `recordCancellation` in `Order`; single use-case -> single save.
- [`CancelItemDto` reuse couples the kitchen route to an orders-side DTO file] -> If it causes awkward imports, duplicate the 2-field DTO under kitchen/presentation — decide during implementation, no spec impact.

## Migration Plan

No data migration. Deploy order irrelevant — additive endpoint + domain method; the waiter path is untouched. Rollback: revert the route/use-case/domain method; no schema or seed changes.

## Open Questions

None — statuses, actors, route shape, and message semantics were decided with the user during exploration.
