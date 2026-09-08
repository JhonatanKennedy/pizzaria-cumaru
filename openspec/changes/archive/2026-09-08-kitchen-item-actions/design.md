## Context

The kitchen panel today is a read-only projection (`GET /kitchen/queue`) while the actions its users perform — starting and finishing preparation — are exposed through `PATCH /orders/:orderId/items/:itemId/status` in the orders controller, dispatched on a status string. The queue identifies rows by catalog `itemId`, but the status use-cases match on the **order-item** id (`entry.getId()`), so the panel cannot address the line it renders. See proposal.md for motivation; requirements are in the kitchen-queue spec delta.

Current relevant facts:
- `start-item-preparation` / `finish-item-preparation` live in `orders/application` and take `{ orderId, itemId }` where `itemId` is the order-item id. They are the only callers of the transitions.
- `KitchenModule` already imports `OrdersModule` (for the repository tokens); `OrdersModule` does not export use-cases today.
- Only `test/order-status.e2e-spec.ts` calls the route being removed (six sites, one per scenario).

## Goals / Non-Goals

**Goals:**
- Kitchen context exposes start/finish as explicit endpoints for Cook/Manager.
- Queue rows carry the order-item id so every row is individually actionable, duplicates included.
- Remove the generic orders item-status route and its dispatch.

**Non-Goals:**
- No domain, repository, schema, or permission-matrix changes (see specs — order-item-status and authorization/permissions are untouched).
- Cancellation stays waiter-side on orders; delivery order status stays on orders.
- No realtime/websocket delivery of queue updates.

## Decisions

### 1. Kitchen controller delegates to the existing orders use-cases
The new endpoints are thin adapters in `KitchenQueueController` that call `start-item-preparation` / `finish-item-preparation`; `OrdersModule` exports those two use-cases so `KitchenModule` can inject them.

- *Alternative rejected:* re-implementing preparation logic inside kitchen — would duplicate the transition rules the orders aggregate already enforces.
- *Alternative rejected:* moving the use-cases into kitchen — they mutate the orders aggregate through the orders repository; the application layer stays with its context, matching the archived decision that only the HTTP surface changes.

### 2. Two explicit verb endpoints, not a status PATCH
`POST /kitchen/orders/:orderId/items/:orderItemId/start` and `.../finish` each call their use-case directly. This removes the controller's `if (dto.status === 'Preparing')` dispatch, lets the route shape express the domain verb, and deletes `UpdateItemStatusDto` (and with it the `@IsIn(['Preparing', 'Ready'])` validation branch — there is no longer a status payload to validate).

Route params use `:orderItemId` on the wire to match what the queue emits; internally it maps to the use-case's `itemId` field (the order-item id), whose confusing name is pre-existing and out of scope.

### 3. Queue rows emit `orderItemId`, keep the display fields
`IKitchenQueueItem` gains `orderItemId` (from `OrderItems.getId()`); `itemId` (catalog), `name`, `quantity`, `status`, `createdAt` stay. Additive, no renames — the only consumer is the e2e suite, which asserts the new field and the duplicate-row behavior.

## Risks / Trade-offs

- **OrdersModule export surface grows** (two use-cases exported) → accepted; it is the standard Nest pattern for cross-module use, and kitchen already imports the module.
- **Removed route breaks hypothetical consumers** → only caller is `order-status.e2e-spec.ts`, which this change retargets; the removal is BREAKING and called out in the proposal.
- **Loss of the "invalid status value → 400" validation scenario** → that coverage tested the deleted DTO; domain-transition refusals (finish on Pending, start on Preparing) keep covering the state machine through the new routes.
- **The wire param is `orderItemId` while the domain type still says `itemId`** → mapped at the controller boundary; renaming the use-case params is a separate cleanup, not needed for this change.

## Migration Plan

No schema or data migration (no Prisma change). Deploy is a single commit: routes land together with the removal and the e2e retarget. Rollback is `git revert` of the change commit — the orders PATCH route and DTO return intact.

## Open Questions

None — remaining unknowns (e.g. frontend panel consumption of `orderItemId`) do not change the specs, approach, or task breakdown.
