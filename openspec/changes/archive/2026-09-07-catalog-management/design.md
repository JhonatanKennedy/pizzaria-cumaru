## Context

Stock state changes flow through readers that already exist: the kitchen queue hides items with unavailable ingredients, and add-item (orders-creation) refuses them. What's missing is the write side: no endpoint changes `Ingredient.inStock` or `Item.price`, and the stubs from the scaffold are unimplemented. The error-handling change has landed, so DTOs ship decorated and refusals surface as 400.

## Goals / Non-Goals

**Goals:**

- Manager endpoints for stock marking and price updates.
- Listings that expose derived availability.

**Non-Goals:**

- Creating/editing/deleting menu items (no feature describes it).
- Roles (last change); purchase/restock quantities (no feature).

## Decisions

### D1. Stock endpoint shape

`PATCH /ingredients/:ingredientId/stock` with body `{ available: boolean }` — one route mapping to the two domain methods (`markOutOfStock` / `markInStock`), which already exist on `Ingredient`. Alternative considered: two verb-y endpoints — rejected (REST verbs, not actions, per the routing rules).

### D2. Price endpoint

`PATCH /items/:itemId/price` with `{ price }`. The domain's `changePrice` already refuses negatives with `'Price cannot be negative'` — no new validation; the filter maps it to 400.

### D3. Derived availability in listings

`available` is computed in the list-items use-case: an item is available when all its ingredient ids map to ingredients with `inStock === true`. Not persisted — stock is the single source of truth. Alternative considered: an `available` column maintained on writes — rejected (denormalization with drift risk, no reader needs a faster query at this scale).

### D4. Repository methods

`ICatalogRepository` gains `findItemById`, `findIngredientById`, `saveItem`, `saveIngredient`. Saves are full-row updates (name/inStock/price as held by the aggregate).

### D5. Module wiring

`CatalogModule` gains the controller + five use-case providers; it already exports the repository token consumed by orders and kitchen. No cross-module changes.

## Risks / Trade-offs

- [Availability is derived per request] → Fine at this scale; the kitchen queue and add-item already do the same per-request derivation.
- [Stock marking has no audit trail] → No feature requires one; future change if the manager needs history.

## Open Questions

None.
