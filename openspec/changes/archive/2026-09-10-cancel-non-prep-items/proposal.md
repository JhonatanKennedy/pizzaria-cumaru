## Why

Items that never enter the kitchen flow — water, beer, desserts served as-is — cannot be cancelled in the order-detail screen even though the product rule (`09_cancellation_and_payment.feature`) and the backend allow cancelling them at any moment while the order is open. The "Cancelar" action is offered only when `item.status === 'Pending'`, but non-preparation items keep a `null` status, so their button never appears.

## What Changes

- The local-order detail screen (`/waiter/orders/:orderId`, shared by Waiter and Manager) offers "Cancelar" for an item of an open order when it either is still `Pending` or never requires preparation (`status` is `null`). Kitchen-flow items that started (`Preparing`, `Ready`) keep no cancellation action — the backend refuses those ("Cannot cancel an item in preparation").
- The existing `CancelItemDialog` (reason required) is reused; the backend endpoint is unchanged.
- The button condition becomes a pure, unit-tested rule (`canCancelOrderItem`) mirroring the backend's `item.cancel` guard, so UI and domain cannot drift again.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `waiter-table-orders`: the "Cancel a pending item" requirement is scoped so that items which never require preparation are cancellable at any moment while the order is open, not only while `Pending` — mirroring the feature-09 scenario "Cancel an item that does not require preparation at any moment while the order is open".

## Impact

- `src/pages/waiter/pages/order-detail.tsx` — the cancel-action condition (currently `order-detail.tsx:211`).
- A small pure rule with unit tests (waiter business or `@lib`, whichever the review decides) plus the colocated component spec.
- No API changes: the order listing schema already parses `status` as nullable.
- Out of scope: cancellation in the manager's delivery-order detail (no cancellation exists there at all — tracked separately).

## Superseded

The `CancelItemDialog` no longer asks for a reason: `order-and-catalog-polish` removed `reason` from the cancellation endpoints and `order-and-menu-polish` removed the field from the SPA dialogs. The delta in `specs/` describes the shipped, reason-free confirmation.
