## Context

The manager context is a hub with placeholders. The catalog endpoints are fully mapped (see proposal.md — Why). The waiter context already consumes `GET /items` through its own `catalog.api` and owns category labels in `business/labels.ts`. Contexts never import each other (house rule), and the catalog is now needed by two contexts — that tension drives D1.

## Goals / Non-Goals

**Goals:**

- Full item and ingredient management UI on `/manager/menu` (two tabs), consuming the existing backend endpoints with zod-validated responses.
- One shared source of truth for the catalog contract (API + schemas + labels + query keys) used by waiter and manager.
- The manager context's first real business/ + hooks/ + components/ implementation.

**Non-Goals:**

- Link/unlink ingredient↔item management — deferred until `GET /items` exposes `ingredientIds` (product decision).
- No changes to routes, roles or the backend.
- No polling — mutation invalidation + window-focus refetch, as established.

## Decisions

### D1: Shared catalog contract in `@api/catalog.api.ts` + `@lib/catalog.ts`

The catalog is cross-context by nature. Instead of duplicating `listMenu`/schemas/labels in the manager context (and violating "contexts never import each other" by having manager import waiter), the catalog contract moves to the shared layer:

- `@api/catalog.api.ts` — `listMenu()`, `listIngredients()`, `createItem`, `updateItem`, `updateItemPrice`, `deleteItem`, `createIngredient`, `renameIngredient`, `updateIngredientStock`, `deleteIngredient`; the listing zod schemas; and `MENU_QUERY_KEY` / `INGREDIENTS_QUERY_KEY` so both contexts invalidate the same caches.
- `@lib/catalog.ts` — `CATEGORY_ORDER`, `CATEGORY_LABELS`, `categoryLabel` (moved from the waiter's `labels.ts`, which keeps only order/item status labels).

- *Alternative considered:* per-context `catalog.api` modules with duplicated `listMenu`. Rejected: two copies of the same contract drift apart, and the waiter's spec fixtures already prove the shared shape.
- *Trade-off:* `api/` grows beyond the raw HTTP seam. Accepted — it remains "API-layer code, no React, no feature imports".

### D2: One screen, two tabs

`/manager/menu` renders a tab switch (**Itens | Ingredientes**) as local UI state — no URL state, no second route. Each tab is its own part under `pages/manager/pages/menu/parts/`, so the page file stays a composer (house pattern: pages thin, parts in folders).

- *Alternative considered:* two routes (`/manager/menu`, `/manager/ingredients`). Rejected: one screen per feature file, and the manager hub already links one card to this screen.

### D3: Rows, not cards, for management lists

Item/ingredient rows (name, chips, price, actions) in a Card — management UI is action-dense, unlike the waiter's browsing tiles. Availability renders as the same grayed "Indisponível" badge used in the waiter panel; the stock toggle is a single button flipping `available`.

### D4: Dialogs for mutations

`ItemFormDialog` (create: name, description, price, category select, requiresPreparation checkbox), `EditItemDialog` (name/description), `PriceDialog` (price), `IngredientFormDialog` (create/rename share the same `{ name }` shape with a mode), and a context-level `ConfirmDialog` for deletions ("Excluir"/"Cancelar"). Deletes ask for confirmation — no undo exists.

- *Alternative considered:* one mega-dialog with modes. Rejected: three small dialogs keep zod schemas aligned one-to-one with the backend DTOs (`CreateItemDto` needs category/requiresPreparation; `UpdateItemDto` accepts only name/description; `UpdateItemPriceDto` only price).

### D5: Category select sources from the shared catalog module

The category `<select>` renders `CATEGORY_ORDER` + `categoryLabel` from `@lib/catalog`; the zod schema accepts the raw enum strings (fallback-friendly, like statuses elsewhere).

## Risks / Trade-offs

- [Two contexts share one cache key] → invalidation is centralized in `@api/catalog.api.ts`; a manager price change refreshes the waiter's menu on next focus. Verified by the shared-keys design, not by tests alone.
- [Deferred link/unlink leaves feature 02 partially built] → accepted by product decision; the proposal records exactly which scenarios are deferred so the next slice picks them up.
- [Shared module drift] → `@api/catalog.api.ts` and `@lib/catalog.ts` carry their own specs; any backend contract change touches exactly one file.

## Open Questions

None.
