## Context

`POST /orders` and the add-item path are stubs; `Order` has no delivery fields and `OrderItems` has no flavors/notes; `paymentType` is currently required at creation even though the features only mention payment at closing. The error-handling change has landed, so new DTOs ship with `class-validator` decorators and domain errors surface as 400. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Real creation endpoints for local and delivery orders, and the add-item flow with flavors, observations, and price snapshotting.
- The at-most-one-open-order-per-table invariant.

**Non-Goals:**

- Closing/payment (orders-checkout), delivery status cycle (delivery-order-status), roles (last change).

## Decisions

### D1. Delivery fields on `Order`

`Order` gains `customerName`, `phone?`, `address?` — populated only for delivery orders; `Order.create` validates: a "Delivery" order without `customerName` and `address` throws the spec messages. `phone` stays optional (no feature defines a refusal for a missing phone — recorded assumption).

### D2. `paymentType` becomes optional

`TCreateOrderParams.paymentType?` — creation no longer requires it; the checkout change sets it at close. Mapper persists `null` when absent. The existing `paymentType` column stays nullable.

### D3. Flavors and notes on `OrderItems`

`flavors: string[]` (default `[]`) and `notes?: string`. The split-pizza price rule is **computed in the add-item use-case** (it needs catalog flavor prices): `unitPrice = max(flavor prices)`. The aggregate stores the resolved price — the rule is unit-tested at the use-case level with a fake catalog repository. The e2e asserts the visible outcome (price = highest flavor).

### D4. Price snapshot at add time

Add-item looks up the catalog item (`ICatalogRepository.findItemById` — new method) and passes the current price as `unitPrice`. Price updates affect new orders only (02's rule).

### D5. Availability check at add time

Add-item loads the item's ingredients and refuses when any is unavailable (`'Item is unavailable'`). The check lives in the use-case, using the catalog repository — same shape as the kitchen queue's hiding rule, kept as a use-case concern so the aggregate stays free of catalog reads.

### D6. One open order per table

Enforced in the create use-case via a new repository method `findOpenByTableId(tableId)` — a cross-aggregate invariant, so it cannot live on the aggregate (documented). Refusal message: `'Table already has an open order'`.

### D7. Routes and DTOs

`POST /orders` (one endpoint, `type: "Local" | "Delivery"` discriminates; tableId required for Local; address required for Delivery — the DTO is validated per type in the use-case) and `POST /orders/:orderId/items`. DTOs carry `class-validator` decorators; the use-cases throw the spec messages for business refusals.

### D8. Persistence

Second migration: `Order.customerName`, `Order.phone`, `Order.address`, `Order.paymentType` nullable, `OrderItem.flavors String[]`, `OrderItem.notes String?`. Mappers round-trip the new fields.

## Risks / Trade-offs

- [Type-discriminated `POST /orders` mixes two creation flows] → The DTO validates per type and the use-case throws precise messages; a dedicated endpoint per type was considered and rejected (REST noun-first, same resource).
- [Split-pizza pricing lives in the use-case, not the aggregate] → Accepted: it needs catalog prices; the resolved `unitPrice` keeps the aggregate's totals honest and unit-testable.
- [`findOpenByTableId` is a query, not an invariant on the aggregate] → Accepted and documented in D6; e2e covers the refusal.

## Open Questions

None — all decisions locked (multi-flavor pricing decided with the product owner: highest flavor price).
