## Why

The catalog is append-only through the API: items and ingredients enter the database only by seed or by hand, and the manager can update a price or flip an ingredient's stock but cannot add, rename, describe, re-link, or remove anything. The archived `catalog-management` change declared this exact scope ("Out of scope: creating/editing/deleting menu items themselves") — this change closes it.

## What Changes

- **Create items** — `POST /items` (Manager): a menu item with name, description, price, category (Pizza/Dish/Drink/Dessert/Side), whether it requires preparation, and optionally its initial ingredient links. A duplicate item name SHALL be refused.
- **Edit items** — `PATCH /items/:itemId` (Manager) for name and description (price keeps its dedicated `PATCH /items/:itemId/price` route); category is fixed at creation. Ingredient links get explicit verbs: `POST /items/:itemId/ingredients` (link) and `DELETE /items/:itemId/ingredients/:ingredientId` (unlink), using the existing `linkIngredient` / `unlinkIngredient` domain methods.
- **Remove items** — `DELETE /items/:itemId` (Manager). Deleting an item removes it from the menu and the kitchen queues. Order rows keep their own copy of the item reference — the schema has no FK from `OrderItem.itemId`, so historical orders are not blocked and their rows persist; the item simply vanishes from catalog lookups.
- **Create / rename / remove ingredients** — `POST /ingredients` (Manager, duplicate names refused), `PATCH /ingredients/:ingredientId` (Manager, rename), `DELETE /ingredients/:ingredientId` (Manager). Deleting an ingredient cascades its `itemIngredient` links (already `onDelete: Cascade` in the schema): dishes stop depending on it and stay on the menu without it. An `Ingredient.rename` domain verb is added (the only missing CRUD verb in the domain).
- **Persistence** — the catalog repository gains `deleteItem`, `deleteIngredient`, and (for the duplicate-name guard) `findIngredientByName`.
- **Listings (read side, unchanged)** — `GET /items` (menu listing with derived availability) and `GET /ingredients` (ingredient listing with stock) already exist from the archived `catalog-management` change and remain the read side of this CRUD. Every write above is reflected in them immediately: created items appear in the listing, renames propagate to the waiter and kitchen views, and removals drop out of the listing, the queues, and the new-order screen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `catalog/management`: the manager's surface grows from stock/price/listing to full catalog CRUD — creating, editing, and removing menu items (including their ingredient links) and ingredients, with duplicate-name refusal and the removal semantics above.

## Impact

- `src/catalog/domain/entities/` — `Ingredient.rename()` added; `Item`/`Ingredient.create` reused as-is.
- `src/catalog/application/use-cases/` — new use-cases: create/rename/remove item, link/unlink ingredient, create/rename/remove ingredient (route-shape details in design).
- `src/catalog/domain/repositories/catalog-repository.ts` + `src/catalog/infrastructure/prisma-catalog-repository.ts` — delete + find-by-name methods; `src/catalog/catalog.module.ts` — providers/controllers wired.
- `src/catalog/presentation/` — new controllers/routes on `items.controller.ts` / `ingredients.controller.ts` + DTOs, all Manager-only; permission matrix comment in `roles.guard.ts` updated.
- Tests: unit specs per use-case/domain verb; e2e scenarios in a catalog-management spec file (create → appears in listing with availability; rename/price ripple; delete removes from menu while past orders remain readable).
- `features/02_menu_and_stock.feature` — scenarios added.

**Prerequisites**: `catalog-management` (stock/price/listing + repository save/find shape), `user-roles-and-authorization` (Manager-only surface).
**Out of scope**: item categories beyond the existing enum (no new "merch" category), stock management changes, waiter-facing menu behavior beyond what removal implies.

## Superseded

The dedicated `PATCH /items/:itemId/price` route and the `POST`/`DELETE /items/:itemId/ingredients[/:ingredientId]` routes described above were retired afterwards by `order-and-catalog-polish`, which collapsed them into the single `PATCH /items/:itemId` carrying optional `price`, `requiresPreparation` and a wholesale `ingredientIds` array. The deltas in `specs/` are unaffected — none of them names a route.
