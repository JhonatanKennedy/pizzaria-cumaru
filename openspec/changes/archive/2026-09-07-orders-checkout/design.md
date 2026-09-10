## Context

`Order.close()` takes no payment method and records no timestamp; `paymentType` is a creation-time readonly field; the report and listing stubs exist but nothing implements them. The delivery cycle (previous change) ends at "Delivered" — the earnings report's "completed delivery" means exactly that status. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Closing records payment + time; the report and listing become real read paths.

**Non-Goals:**

- Delivery payment/close (no feature; "Only local orders can be closed" refusal — an inference, flagged).
- Roles (the "only the manager closes" rule is enforced by the authorization change applied last).

## Decisions

### D1. `close(paymentType, closedAt)` on `Order`

Replaces the parameterless `close()`: guards status OPEN (else `'Order is already closed'`), requires at least one item (`'Order must have at least one item'`, unchanged), sets `CLOSED`, records the payment method and `closedAt` (caller-supplied clock, same convention as `createdAt`/`deliveredAt`). `paymentType` becomes mutable (was `readonly`). Local-only is enforced at the use-case level (`'Only local orders can be closed'`), not the aggregate — an inference beyond the features, flagged in Risks.

### D2. Bill splitting is computed, not persisted

The close use-case accepts optional `splitInto`; parts are `total / splitInto` repeated, returned in the response. No feature requires persisting parts; adding storage later is cheap if one does.

### D3. Earnings report query

New repository method `findCompleted(day: Date): Promise<Order[]>` — orders whose `closedAt` or `deliveredAt` fall within the given day. The use-case groups: local + `Closed` → local total, delivery + `Delivered` → delivery total, grand = sum. The `?type=` filter narrows the response to that type's total.

### D4. Listing with waiter names

New repository method `findAllForListing(): Promise<Array<{ order: Order; waiterName: string | null }>>` — joins the `User` table by `userId`. `null` covers orders whose waiter row is missing (defensive; seeds provide the users). The use-case maps to the response shape including item statuses (already on the aggregate).

### D5. Routes

`POST /orders/:orderId/close` → `{ total, paymentType, parts? }`; `GET /reports/daily-earnings?type=Local|Delivery` → `{ grandTotal, localTotal, deliveryTotal }`; `GET /orders` → day's orders with waiter names. DTOs ship with validation decorators (error-handling has landed).

### D6. Persistence

Fourth migration: `Order.closedAt DateTime?`. Mapper round-trips it; `paymentType` column already nullable (creation change).

## Risks / Trade-offs

- ["Only local orders can be closed" is an inference] → The features only show table closings; the message is invented but needed for a defined refusal. Flagged for the product owner to veto.
- [Day boundary is server-local time] → `closedAt`/`deliveredAt` are instants; "the day" is computed in the app's timezone. Acceptable for a single-store system; timezone handling is a future concern if multi-location.

## Open Questions

None — split-parts persistence and the local-only message are recorded decisions/inferences above.
