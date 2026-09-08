## Why

The kitchen panel is read-only, yet the cook and the manager act from it: starting and finishing preparation currently happens through a generic `PATCH /orders/:orderId/items/:itemId/status` that belongs to the orders context. Worse, the queue projection identifies each row by the **catalog** item id while the status endpoint requires the **order-item** id — so the panel cannot address the line it displays, and an order with two identical dishes renders two indistinguishable rows of which only the first can ever be acted on.

## What Changes

- **Kitchen owns preparation actions** — the kitchen context gains two explicit endpoints, guarded for Cook and Manager only, that delegate to the existing `start-item-preparation` / `finish-item-preparation` use-cases in orders:
  - `POST /kitchen/orders/:orderId/items/:orderItemId/start`
  - `POST /kitchen/orders/:orderId/items/:orderItemId/finish`
- **BREAKING: the generic item-status route is removed** — `PATCH /orders/:orderId/items/:itemId/status` and its `UpdateItemStatusDto` (including the controller's status-string dispatch) are deleted. Preparation transitions are only reachable through the kitchen endpoints.
- **Queue items become addressable** — each item in the kitchen queue exposes the id of the order item it represents (`orderItemId`), so a row can be acted on unambiguously even when the order holds several lines of the same catalog item. The catalog `itemId` and display fields stay for presentation.
- Domain, repositories, the preparation state machine, cancellation (waiter-side), and the permission matrix are unchanged — this is a surface-and-projection change only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `kitchen/kitchen-queue`: queue items become individually addressable order items, and the panel gains the preparation actions (start / finish) that cooks and managers perform on the rows it shows.

## Impact

- `src/kitchen/presentation/controllers/kitchen-queue.controller.ts` and `kitchen.module.ts` — new endpoints and providers.
- `src/orders/presentation/controllers/orders.controller.ts` — removal of the item-status route, its dispatch branch, and the injected use-cases stay (they move behind the kitchen controller).
- `src/orders/presentation/dtos/update-item-status.dto.ts` — deleted.
- `src/kitchen/application/use-cases/list-kitchen-queue.ts` and its types (`IKitchenQueueItem`) — emit `orderItemId`.
- `test/order-status.e2e-spec.ts` — retargeted to the kitchen routes (its six call sites are the only callers).
- Specs: `openspec/specs/kitchen/kitchen-queue/spec.md` gains the delta requirements; `openspec/specs/orders/order-item-status/spec.md` and `authorization/permissions/spec.md` unchanged.
