## Why

The catalog is read-only from the API's perspective: the manager cannot mark an ingredient unavailable, restore it, or update an item's price — yet every availability behavior (waiter screen, kitchen queue, add-item refusal) depends on that stock state. The menu-and-stock feature (02) requires the management endpoints.

## What Changes

- **Stock marking** — `PATCH /ingredients/:ingredientId/stock` with `{ available: boolean }` marks an ingredient unavailable or available again (the existing `mark-ingredient-out-of-stock` / `mark-ingredient-in-stock` stubs, implemented). Effects ripple through existing readers: kitchen queue hides/shows dependent items, add-item refuses/accepts, waiter listing shows availability.
- **Price update** — `PATCH /items/:itemId/price` with `{ price }` changes the item's price; new orders snapshot the new price (already the add-item behavior). Negative prices are refused.
- **Menu and ingredient listings** — `GET /items` returns menu items including a derived `available` flag (all required ingredients in stock); `GET /ingredients` returns ingredients with their availability.
- **Persistence** — catalog repository gains `findItemById`, `findIngredientById`, `saveItem`, `saveIngredient`.

## Capabilities

### New Capabilities

- `catalog/management`: marking ingredients available/unavailable, updating item prices, and the menu/ingredient listings with derived availability.

### Modified Capabilities

None — main specs tree is still empty (sync tracked separately).

## Impact

- `src/catalog/application` — four stubs implemented (`mark-ingredient-out-of-stock`, `mark-ingredient-in-stock`, `update-item-price`, `list-items`, `list-ingredients`).
- `src/catalog/presentation` — first catalog controllers + DTOs (decorated — error-handling has landed).
- `src/catalog/domain/repositories/catalog-repository.ts` — save/find methods added; `src/catalog/infrastructure` — implementation.
- `src/catalog/catalog.module.ts` — controllers and providers wired; exported repository already consumed by orders/kitchen.

**Prerequisites**: `http-error-handling`, `orders-creation` (add-item availability check consumes the same stock state).
**Out of scope**: creating/editing/deleting menu items themselves (no feature describes it), roles (last change).
