## Context

The order-detail screen offers "Cancelar" only when `item.status === 'Pending'` (`src/pages/waiter/pages/order-detail.tsx:211`). Items that never require preparation carry a `null` status (the backend only assigns `Pending` to preparation items at add time), so their cancel action never renders — while the backend's domain rule (`OrderItems.cancel`) refuses only preparation items that are no longer `Pending`. See proposal.md — Why; requirements in specs/waiter-table-orders.

## Goals / Non-Goals

**Goals:**
- Make the UI cancel action agree with the backend rule, expressed once as a pure, tested function.

**Non-Goals:**
- No backend or contract changes (the listing schema already parses `status` as nullable).
- No cancellation for delivery orders (the manager delivery detail still has none — tracked separately).

## Decisions

**D1 — The rule keys on `status === null`, not on `requiresPreparation`.**
The order-listing schema (`@api/orders.api.ts`) does not carry `requiresPreparation`, and the backend guarantees that a `null` status means the item never entered the kitchen flow (preparation items are `Pending` from add time; cancelled items are removed from the payload). So the rule is `orderIsOpen && (status === null || status === 'Pending')` — `Preparing`/`Ready` preparation items stay without an action, matching the domain guard.
*Alternative considered:* extend the listing schema with `requiresPreparation` and key the rule on it — more structurally explicit, but a contract + enrich change for no behavioral difference today. Revisit if the backend ever assigns statuses to non-preparation items.

**D2 — The rule lives in the waiter business layer.**
A pure `canCancelOrderItem(status: string | null): boolean` next to the other waiter order rules (`pages/waiter/business/`), unit-tested. The manager delivery flow would hoist it to `@lib` when it gains cancellation — not now.
*Alternative:* put it in `@lib` immediately — no second consumer exists yet; keep it context-local per the dependency conventions.

**D3 — Button condition swap only.**
`order-detail.tsx:211` calls the rule; the existing `CancelItemDialog` (required reason) and its mutation hook are reused unchanged.

## Risks / Trade-offs

- [A future backend change assigns `Pending` to non-preparation items] → the null-status assumption breaks silently; the unit test documents the assumption and the backend contract comment (`orders.api.ts`) pins it down.
- [A `Ready` preparation item on an open order stays non-cancellable even though the customer gave it up] → matches the backend rule and the spec scenarios; whole-order cancel remains the path for that case.
