## 1. Domain and persistence groundwork

- [x] 1.1 Add `rename(name)` to `Ingredient` (non-blank name; use the existing name-invariant wording) and verify `ingredients.spec.ts` covers rename and blank-name refusal (`npm test`)
- [x] 1.2 Convert `saveItem` and `saveIngredient` in `PrismaCatalogRepository` to upsert (mirroring `PrismaOrdersRepository.save`; the item upsert rewrites ingredient links via `deleteMany` + `create` in both branches) and add `deleteItem(id)` / `deleteIngredient(id)` plus `findIngredientByName(name)` to `ICatalogRepository` and its implementation; verify `npm run build` passes and the existing catalog e2e suite still passes

## 2. Item use-cases and routes

- [x] 2.1 Add `CreateItemUseCase` (validates name/description non-blank, category against `EItemCategory`, non-negative price via `Item.create`, resolves `ingredientIds` through `findIngredientById`, refuses duplicate names with `Item name already in use`, assigns `id: randomUUID()`, saves via upsert) with a unit spec covering create, duplicate-name refusal, and unknown-ingredient refusal (`npm test`)
- [x] 2.2 Add `UpdateItemUseCase` (rename + description on an existing item; not found -> `Item not found`; duplicate name refusal on rename) and `RemoveItemUseCase` / `LinkIngredientToItemUseCase` / `UnlinkIngredientFromItemUseCase` with unit specs (`npm test`)
- [x] 2.3 Expose Manager-only routes in `ItemsController`: `POST /items`, `PATCH /items/:itemId`, `POST /items/:itemId/ingredients`, `DELETE /items/:itemId/ingredients/:ingredientId`, `DELETE /items/:itemId` (DTOs with class-validator; existing price route untouched); update the permission matrix comment in `roles.guard.ts`; verify `npm run build` passes

## 3. Ingredient use-cases and routes

- [x] 3.1 Add `CreateIngredientUseCase` (duplicate names refused with `Ingredient name already in use`, `id: randomUUID()`) and `RenameIngredientUseCase` / `RemoveIngredientUseCase` with unit specs (`npm test`)
- [x] 3.2 Expose Manager-only routes in `IngredientsController`: `POST /ingredients`, `PATCH /ingredients/:ingredientId`, `DELETE /ingredients/:ingredientId` (DTOs; stock route untouched); verify `npm run build` passes

## 4. End-to-end scenarios

- [x] 4.1 Add e2e coverage in `test/catalog-management.e2e-spec.ts` for the spec deltas: creating a pizza makes it appear in the menu listing with derived availability; duplicate item/ingredient names return the refusal messages; renaming an item shows the new name in the listing and the kitchen queue; linking an ingredient makes the item follow that ingredient's stock while unlinking releases it; removing an item hides it from menu and queue while an order containing it stays open with its line items intact; removing an ingredient drops it from the listing and recomputes dependent items' availability; a Waiter is refused on the write routes (`npm run test:e2e`)

## 5. Feature spec

- [x] 5.1 Add manager CRUD scenarios to `features/02_menu_and_stock.feature` describing the observable outcomes (creating/renaming/removing items, registering/renaming/removing ingredients, linking and unlinking ingredients to items)

## 6. Verification

- [x] 6.1 Run `npm test`, `npm run test:e2e`, `npm run lint`, and `npm run format` and verify all pass
