## Why

The Menu and stock screen has no way to express that items are made of ingredients, even though the backend already models the relationship and gates availability from it: an item is `available` only while none of its linked ingredients is out of stock — the kitchen queue hides out-of-stock items and adding one to an order is refused (`'Item is unavailable'`), while the waiter panels already disable unavailable items. Without a UI the manager cannot attach ingredients when registering an item, cannot see or change the links of an existing item, and `GET /items` did not even expose `ingredientIds` — the link state was invisible to the SPA, so the reasons behind a flipped availability could not be managed on the same screen.

## What Changes

- `GET /items` (sibling backend change) exposes each item's `ingredientIds`; the menu listing contract now requires the field (lockstep, `[]` for unlinked items).
- The item registration form gains an "Ingredientes" checkbox fieldset and sends the selected ids on create (`POST /items` already links them).
- Every menu row gains an "Ingredientes" action that opens a manage dialog seeded from the item's current links: per-ingredient toggles issue `POST /items/:itemId/ingredients` / `DELETE /items/:itemId/ingredients/:ingredientId`, the row stays busy while in flight, and backend refusals surface verbatim.
- Linking an out-of-stock ingredient stays legal — the item simply becomes unavailable (derived availability), which the menu reflects on the shared query refresh.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `manager-menu-stock`: items gain an ingredient-relationship surface — attach at creation, manage per item — backed by `ingredientIds` on the item contract. The stock-to-availability consequences were already specced under "Manage the ingredients" (a marked-unavailable ingredient flips the items that depend on it); this change adds the link-management requirement that makes the dependency editable.

## Impact

- Sibling backend: `src/catalog/application/use-cases/list-items.ts` maps `ingredientIds` into the listing; its spec and the catalog e2e assert the new field.
- `src/api/catalog.api.ts` — `menuItemSchema` requires `ingredientIds`, `ICreateItemPayload` carries them, and `linkIngredientToItem` / `unlinkIngredientFromItem` wrap the two endpoints.
- `src/pages/manager/business/schemas.ts` — the item form schema gains `ingredientIds`.
- `src/pages/manager/hooks/` — `use-link-ingredient.ts` and `use-unlink-ingredient.ts` invalidate the shared menu query.
- `src/pages/manager/components/ItemFormDialog/` — the new "Ingredientes" fieldset; new `ItemIngredientsDialog/` — the per-item link manager.
- `src/pages/manager/pages/menu/` — `MenuPage` passes the ingredient listing down; `MenuTab` gains the row action and wires the dialogs.
- Colocated specs updated/extended; form and dialog fixtures gain `ingredientIds`.

## Superseded

The "Ingredientes" manage dialog and the `POST`/`DELETE /items/:itemId/ingredients[/:ingredientId]` endpoints described above were retired afterwards by `order-and-catalog-polish`, which replaced them with a wholesale `ingredientIds` array on the single `PATCH /items/:itemId`. The delta in `specs/` describes the shipped flow — link editing lives in the `ItemFormDialog` fieldset.
