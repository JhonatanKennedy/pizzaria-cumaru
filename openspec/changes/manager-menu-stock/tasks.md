## 1. Shared catalog contract

- [x] 1.1 Create `lib/catalog.ts` — `CATEGORY_ORDER`, `CATEGORY_LABELS`, `categoryLabel` moved from the waiter's `labels.ts`; move the category part of the waiter `labels.spec.ts` into a colocated `lib/catalog.spec.ts`. Verify: waiter specs updated and green; `npm test` passes.
- [x] 1.2 Create `api/catalog.api.ts` — `listMenu`, `listIngredients` and the item/ingredient mutations against the backend DTOs, plus the listing zod schemas and `MENU_QUERY_KEY` / `INGREDIENTS_QUERY_KEY`. Verify: `tsc` passes; payloads match the backend DTO shapes.

## 2. Waiter context switches to the shared contract

- [x] 2.1 Delete `pages/waiter/api/catalog.api.ts`; update `use-menu.ts` to the shared `listMenu` + `MENU_QUERY_KEY`; update `AddItemPanel` and its spec to import category labels from `@lib/catalog`. Verify: `npm test` green; `grep -rn "waiter/api/catalog" src/` returns nothing.

## 3. Manager business and hooks

- [x] 3.1 Create `pages/manager/business/schemas.ts` — zod schemas for the item form (name, description, price, category, requiresPreparation), the price form and the ingredient name form, pt-BR validation messages. Verify: colocated spec covers valid and invalid payloads; `npm test` green.
- [x] 3.2 Create `pages/manager/hooks/use-catalog.ts` (menu + ingredients queries on the shared keys) and the mutation hooks (`use-create-item`, `use-update-item`, `use-update-item-price`, `use-delete-item`, `use-create-ingredient`, `use-rename-ingredient`, `use-toggle-ingredient-stock`, `use-delete-ingredient`), each invalidating the shared keys. Verify: `tsc` passes.

## 4. Manager components

- [x] 4.1 Create `pages/manager/components/ItemFormDialog/index.tsx` — RHF + zod create form (name, description, price, category select from `@lib/catalog`, requiresPreparation checkbox); backend errors via `toErrorMessage`. Verify: component spec asserts validation and the create call; `npm test` green.
- [x] 4.2 Create `pages/manager/components/EditItemDialog/index.tsx` and `PriceDialog/index.tsx` — name/description edit and price edit dialogs with the same conventions. Verify: component specs assert validation and the mutation calls; `npm test` green.
- [x] 4.3 Create `pages/manager/components/IngredientFormDialog/index.tsx` (create/rename modes) and `ConfirmDialog/index.tsx` (title/message + confirm/cancel). Verify: component specs cover modes, validation and confirm; `npm test` green.

## 5. Screen, parts and routing

- [x] 5.1 Create `pages/manager/pages/menu.tsx` (replaces the placeholder) with the Itens/Ingredientes tabs and its parts: item rows (category chip, price, availability badge, edit/price/delete actions) and ingredient rows (availability badge, stock toggle, rename/delete actions), wired to the dialogs and mutations. Verify: screen renders with the dev server; `tsc` passes.
- [x] 5.2 Router unchanged (`/manager/menu` exists); delete the placeholder content. Verify: lint/test/build green.

## 6. Rules sync and final gate

- [x] 6.1 Update `.claude/rules/01-project-context.md` — `02_menu_and_stock` → implemented (link/unlink deferred to a later slice); note the shared catalog contract (`@api/catalog.api.ts`, `@lib/catalog.ts`). Verify: doc matches `find src -type f`.
- [x] 6.2 Run `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and smoke-check the dev server serves `/manager/menu`. Verify: all commands pass.
