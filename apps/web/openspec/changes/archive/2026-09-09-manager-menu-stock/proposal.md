## Why

The manager needs to keep the menu and ingredient stock up to date — that is the screen everything else depends on: the waiter's availability badges, the kitchen's queue filtering and the manager's own pricing all read the catalog. Feature `02_menu_and_stock` is the natural second slice after the waiter flow, and it sets the pattern for the manager context.

## What Changes

- **`/manager/menu` becomes a real screen** with two tabs: **Itens** (list with name, category chip, price, availability badge; create item; edit name/description; update price; delete) and **Ingredientes** (list with availability badge; create; rename; toggle stock; delete). Auth-page aesthetic, pt-BR labels, backend messages verbatim.
- **Shared catalog contract** — the catalog is consumed by two contexts (waiter reads the menu, manager manages it), so its API module, zod schemas and category labels move to the shared layer: `@api/catalog.api.ts` (all catalog endpoints, listing schemas, shared query keys `['menu']` / `['ingredients']`) and `@lib/catalog.ts` (categories + pt-BR labels). The waiter context switches to the shared modules; its `catalog.api` is deleted.
- **Manager business layer** (`pages/manager/business/schemas.ts`) — zod schemas for the item form (name, description, price, category, requiresPreparation), the price form and the ingredient name form.
- **Hooks** — `use-catalog` (menu + ingredients queries) and mutations: create/update/price/delete item, create/rename/stock/delete ingredient; each invalidates the shared query keys.
- **Components** — `ItemFormDialog` (create), `EditItemDialog` (name/description), `PriceDialog`, `ConfirmDialog` (context-shared delete confirmation), `IngredientFormDialog` (create/rename), with colocated specs.
- **Deferred** — link/unlink ingredient↔item management: `GET /items` does not expose an item's current `ingredientIds`, so the unlink UI cannot be built sanely today (see design.md). Item creation still sends `ingredientIds: []` is *not* possible — the field is simply omitted; linking arrives in a later slice.
- **Rules sync** — `01-project-context.md` mapping: `02_menu_and_stock` → implemented (minus link/unlink); shared catalog note.

## Capabilities

### New Capabilities

- `manager-menu-stock`: the manager's menu and stock management — list, create, edit, price and delete menu items; list, create, rename, toggle stock and delete ingredients; unavailable items shown as such.

### Modified Capabilities

None.

## Impact

- `pages/manager/` — new business, hooks, components, and the real `menu.tsx` screen (replaces the placeholder).
- `api/catalog.api.ts`, `lib/catalog.ts` — new shared modules.
- `pages/waiter/` — drops its `catalog.api`, `labels.ts` loses the category part, imports updated (AddItemPanel, use-menu, specs).
- `infra/router.tsx` — no route changes (`/manager/menu` exists).
- Backend: no changes (link/unlink deferred by product decision).
