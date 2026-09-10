## 1. Prerequisites

- [x] 1.1 Verify `http-error-handling` and `orders-creation` are applied and `npm run build` passes

## 2. Repository

- [x] 2.1 Add `findItemById`, `findIngredientById`, `saveItem`, `saveIngredient` to `ICatalogRepository` and implement them in `PrismaCatalogRepository`; verify integration tests cover each lookup and save

## 3. Use-cases and endpoints

- [x] 3.1 Implement `mark-ingredient-out-of-stock` and `mark-ingredient-in-stock` (load, mark, save; unknown ingredient refused with "Ingredient not found") and wire `PATCH /ingredients/:ingredientId/stock` with `{ available }`; verify unit tests with a fake repository cover both directions and the unknown-id refusal
- [x] 3.2 Implement `update-item-price` (load, `changePrice`, save) and wire `PATCH /items/:itemId/price`; verify unit tests cover the happy path and the negative-price error
- [x] 3.3 Implement `list-items` (items + ingredients, derived `available` per item) and wire `GET /items`; verify unit tests cover available/unavailable derivation
- [x] 3.4 Implement `list-ingredients` and wire `GET /ingredients`; verify a unit test covers the listing shape

## 4. E2E

- [x] 4.1 Add e2e coverage: mark "Mussarela" unavailable → `GET /items` shows the dependent pizza as unavailable and `GET /kitchen/queue` hides it; mark it available again → both restore; price update → a new order item snapshots the new price; verify `npm run test:e2e` passes

## 5. Final verification

- [x] 5.1 Run `npm run format`, `npm run lint`, `npm test`, and `npm run test:e2e` and verify all pass
