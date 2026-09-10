## Why

The quantity stepper stays live on an order item the kitchen has already finished. Increasing such an item charges the guest for a portion that never enters the kitchen queue: `ListKitchenQueueUseCase` surfaces only `Pending` and `Preparing` items, so a `Ready` line's tile is already gone by the time the increase is possible. The guest pays for a dish that is never made, and neither the waiter nor the cook sees it happen.

The requirement that governs this behaviour is silent on a finished item — it bounds adjustment only at "while the item is in preparation" and at quantity 1 — so the backend guard's "whatever the item's preparation status" and the SPA's order-level-only stepper gate drifted apart without either contradicting a written rule.

## What Changes

- The backend refuses to **increase** the quantity of an order item whose status is `Ready`. Increasing a `Pending` or `Preparing` item stays allowed — the kitchen reads those lines live, so a quantity change on them is visible to the cook. Decreasing stays allowed in every case (its own problem, tracked separately).
- The SPA disables the increase step on a `Ready` row rather than offering an action that errors, keeping the backend refusal as the backstop for the state that goes stale.
- The waiter's path to add a further portion stays the add-item panel, which creates a new `Pending` line that the kitchen queue does surface.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `waiter-table-orders`: the "Adjust an item quantity" requirement gains the `Ready` bound. Today: "Adjustment MUST stay available while the item is in preparation", with no statement about an item that has left the kitchen.

## Impact

- `apps/api/src/orders/application/use-cases/update-order-item-quantity.ts` and its spec — the increase guard.
- `apps/web/src/pages/waiter/` — a new pure rule beside `can-cancel-order-item.ts`, the order-detail stepper gate, and component specs.
- `features/03_table_order.feature` — a scenario for a finished item, which the file does not currently have. It covers a non-kitchen item and an item in preparation only.
- No schema, migration, DTO or route change; the request payload shape is unchanged.
- `openspec/specs/waiter-table-orders/spec.md` "Adjust an item quantity" is the only requirement whose behaviour moves. No api-level capability spec states a quantity-adjustment rule today, so the domain guard has no separate spec to amend.
