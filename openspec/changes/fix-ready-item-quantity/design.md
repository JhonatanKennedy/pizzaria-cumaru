## Context

See proposal.md — Why. Three pieces of current state shape the approach:

- `OrderItems.increaseQuantity` (`order-items.ts:115`) is a bare arithmetic mutation: it validates `quantity > 0` and adds. It never reads `this.status`. It has exactly one caller, `UpdateOrderItemQuantityUseCase` (`update-order-item-quantity.ts:50`).
- The sibling cancellations already put their lifecycle checks on the entity, not the use-case: `OrderItems.cancel()` refuses when `requiresPreparation && status !== Pending`, and `cancelPreparation()` refuses unless the status is `Preparing`. Both expose a `void` validator that the `Order` aggregate orchestrates — `cancel()`'s doc comment says so explicitly ("the only caller").
- `ListKitchenQueueUseCase` builds its `QUEUE_STATUSES` set from `Pending` and `Preparing` only (`list-kitchen-queue.ts:45`), so a `Ready` line has left the queue by construction. That is the fact the whole change turns on.

## Goals / Non-Goals

**Goals:**

- An increase on a `Ready` line cannot reach the database, from any caller.
- The waiter never sees a live increase step on a row where the increase would be refused.
- The behaviour is stated in the spec, so it stops being an accident of two independent implementations.

**Non-Goals:**

- **Decreasing** a `Ready` line stays allowed and is out of scope. It is a different problem — food waste and revenue, not a guest billed for an unmade dish — and may want a manager-only verb later. Recorded as debt in `apps/api/.claude/rules/08-conventions.md`.
- No change to the delivery flow. The stepper does not exist on the delivery detail screen; its `AddItemsPanel` creates a fresh `Pending` line, which is the correct path already.
- No change to `Order.close`'s existing gate on items still in preparation.

## Decisions

**1. The guard lives on `OrderItems.increaseQuantity`, not in the use-case.**

Rule [06-domain.md#3](apps/api/.claude/rules/06-domain.md) — "invariants enforced at every mutation point" — and the `cancel()` / `cancelPreparation()` precedents both point at the entity. The use-case already has a single caller, so a use-case guard would work today and break silently the first time a second caller appears (a manager "reopen a portion" flow, a bulk adjustment). Putting it on the mutation means the invariant cannot be bypassed.

The guard reads the item's own status, so it needs no signature change and no new parameter:

```ts
increaseQuantity(quantity: number): void {
  if (this.status === EOrderItemStatus.READY) {
    throw new Error('Cannot change a ready item');
  }
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  this.quantity += quantity;
}
```

The message follows the `'Cannot change a closed order'` / `'Cannot change a cancelled order'` family, and surfaces as a 400 through `DomainErrorFilter`.

**2. The SPA gate is a new pure rule, `can-increase-item-quantity`, beside `can-cancel-order-item.ts`.**

Named for the increase specifically, not "adjust quantity" — decreasing a `Ready` item stays available, so a rule called `can-adjust-quantity` would state something false. The order detail applies it to decide whether the increase step is offered; the backend refusal stays the backstop for a status that went stale between render and click, which is the two-layer pattern the close-order flow already documents.

**3. Rejected — split the line on increase** (keep the `Ready` count, append the delta as a new `Pending` line).

It is the most capable option: it preserves "the kitchen reads live order items" exactly, and `+1` on a finished dish would mean what the waiter means by it. Rejected because it changes the listing shape under the waiter — one dish becomes two rows — and it needs the use-case to allocate a new item id mid-update, which turns a quantity mutation into a line-creation. The waiter already has a correct path (the add-item panel); this fix does not need to invent a second one.

**4. Rejected — reset the line's status to `Pending` on increase.**

The kitchen would remake portions that were already served, and the tile would claim more outstanding work than exists.

## Risks / Trade-offs

- **[A waiter with a genuine extra-portion request now has a disabled button and no adjacent hint]** → The add-item panel is already on the order detail and is the documented path; the tasks include a component case asserting it stays reachable from the same screen.
- **[The web gate reads a status the cook may have just changed]** → Accepted; the backend refusal is the backstop and surfaces verbatim, per the spec scenario.
- **[Guarding `increaseQuantity` narrows a domain method other future flows might want]** → Accepted deliberately — that is the point of decision 1. A flow that genuinely needs it should model its own transition rather than reuse an unguarded mutation.
- **[The existing `update-order-item-quantity.ts` doc comment becomes wrong]** ("whatever the item's preparation status — the kitchen reads live order items") → It is edited in the same commit; leaving a comment that asserts the bug's premise is how this drifted the first time.
