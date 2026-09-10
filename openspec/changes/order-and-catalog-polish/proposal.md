## Why

The API side of the SPA's last polish round: the close-order use case lets a manager bill a table whose kitchen items are still `Pending`/`Preparing`, the cancellation endpoints and their history force a reason the operators no longer want to give, and updating a menu item is split across a name/description PATCH, a price-only PATCH and per-ingredient link endpoints instead of one atomic update shaped like the item form.

## What Changes

- **Close gate on kitchen progress** (`orders`): closing an open local order whose items are still `Pending` or `Preparing` is refused with the message `Cannot close an order with items in preparation` (surfaced verbatim by the SPA). **BREAKING**: the checkout e2e that closes an order with a `Pending` pizza now asserts the refusal; closing requires every kitchen item to have reached `Ready`.
- **Cancellations lose the reason** (`orders` + `kitchen`): the cancel-item, cancel-order and cancel-item-preparation DTOs stop accepting `reason`, the domain guards (`Cancellation reason is required`) are removed, and the cancellation history entries keep being recorded without a reason — the `reason` column of `OrderCancellation` is dropped by migration. **BREAKING**: clients may no longer send `reason`.
- **One atomic item update** (`catalog`): `PATCH /items/:id` accepts optional `price`, `requiresPreparation` and `ingredientIds` (wholesale replace) in addition to `name`/`description`; category remains fixed at creation. The price-only `PATCH /items/:id/price` endpoint is retired with its DTO, use case and tests. **BREAKING**: the price endpoint disappears; the SPA saves an edited item through the single PATCH.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orders/checkout`: the close-order rule against items still in preparation.
- `orders/order-item-status`: item cancellations no longer carry a reason and history entries drop it — this also covers the kitchen cancel-preparation endpoint, whose reason the main specs never asserted separately (implementation-level change there).
- `catalog/management`: the price-only update evolves into the full item update (price, preparation flag, ingredients); the price endpoint is retired.

## Impact

- **Use cases**: `close-order.ts` (+ `Order.close` domain rule), `cancel-item-from-order.ts`, `cancel-order.ts`, the kitchen cancel use case, `update-item.ts`; associated DTOs and the orders controller routes.
- **Domain/entities**: `OrderItems.cancel` guard, cancellation-history entry shape, `OrderCancellation` Prisma model + migration dropping `reason`.
- **E2E**: `orders-checkout.e2e-spec.ts` (close-with-Pending flips to a refusal; a new scenario closes once `Ready`), `order-status.e2e-spec.ts` (cancel-item no longer 400s on a missing reason), kitchen queue e2e, `catalog-management.e2e-spec.ts` (price updates move to the single PATCH; price endpoint tests removed).
- **SPA counterpart**: frontend change `order-and-menu-polish` consumes the new contracts and must land in tandem.
