## 1. Backend listing (sibling repo)

- [x] 1.1 `GET /items` maps `ingredientIds` from the item aggregate into the listing (`src/catalog/application/use-cases/list-items.ts`); the catalog use-case spec asserts the field and the catalog e2e asserts it on linked, unlinked and derived-availability fixtures. Verify: backend gate (`npm run build`, `npm run lint`, `npm test`, `npm run test:e2e`, prettier) green.

## 2. Shared contract

- [x] 2.1 `src/api/catalog.api.ts`: `menuItemSchema` requires `ingredientIds: z.array(z.string())`; `ICreateItemPayload` carries `ingredientIds: string[]`; add `linkIngredientToItem(itemId, ingredientId)` (POST `/items/:itemId/ingredients`) and `unlinkIngredientFromItem(itemId, ingredientId)` (DELETE `/items/:itemId/ingredients/:ingredientId`). Verify: `api/catalog.api.spec.ts` covers accept/reject of the field; `npm test` green.

## 3. Form schema and mutations

- [x] 3.1 `itemFormSchema` gains a required `ingredientIds` array (empty valid; `.default([])` would break the `zodResolver` input/output typing, so the empty default comes from RHF `defaultValues`). Verify: `schemas.spec.ts` asserts accept-empty, keep-selected and reject-non-array; `npm run build` passes.
- [x] 3.2 New `hooks/use-link-ingredient.ts` and `hooks/use-unlink-ingredient.ts`: `useMutation` over the API functions; `onSuccess` invalidates `MENU_QUERY_KEY` only (a link flips the item's derived availability in the listing).

## 4. Item form ingredients fieldset

- [x] 4.1 `components/ItemFormDialog/` gains the `ingredients` prop and an "Ingredientes" checkbox fieldset; unavailable ingredients stay selectable with a muted "Indisponível" label (linking them is legal — the item flips unavailable server-side). Verify: `item-form-dialog.spec.tsx` asserts the checked selection lands in the create payload and an empty submission sends `[]`.

## 5. Per-item link dialog

- [x] 5.1 New `components/ItemIngredientsDialog/`: opens from an "Ingredientes" row action; seeds a local `Set` from `item.ingredientIds`; per-ingredient checkbox toggles link/unlink with per-row busy (no racing the same row); success flips the local set, failure shows the backend message verbatim in `role="alert"` and keeps the toggle state; "Fechar" closes. Verify: colocated spec renders linked/unlinked state from the snapshot, toggles call the right mutation, keeps the row disabled while a deferred promise is pending, surfaces an `ApiError` message verbatim and leaves the checkbox unchanged on failure; `npm test` green.

## 6. Menu screen wiring and docs

- [x] 6.1 `MenuPage` passes `ingredients` into `MenuTab`; `MenuTab` renders the "Ingredientes" row action, opens `ItemIngredientsDialog`, and hands `ingredients` to the create dialog. Verify: `npm run build` passes.
- [x] 6.2 Update `.claude/rules/01-project-context.md` (the 02 mapping row drops the "Link/unlink … deferred" note) and this OpenSpec change. Verify: docs match `router.tsx` and the feature mapping.
- [x] 6.3 Final frontend gate: `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings.
