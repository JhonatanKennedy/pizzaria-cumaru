## 1. Waiter and kitchen cancellations without a reason

- [x] 1.1 Drop the Motivo field from the waiter order detail's item and whole-order cancel dialogs and from the kitchen cancel-preparation dialog, stop sending `reason` in the three cancel API calls, and delete `src/lib/cancellation.ts`; verify `grep -r "lib/cancellation" src` finds nothing and `npm run lint` + `npm run build` pass
- [x] 1.2 Update the affected component specs so each cancel flow asserts a plain confirmation (no Motivo) and the backend-refusal display stays; verify `npm test` passes
- [x] 1.3 Keep cancel-ability unchanged — only items with status `null` or `Pending` offer cancellation (`canCancelOrderItem`) — and verify its unit spec still passes

## 2. Closing is blocked while the kitchen prepares

- [x] 2.1 Add a pure helper beside `can-cancel-order-item.ts` (e.g. `hasItemsInPreparation`) reporting whether any order item is `Pending` or `Preparing`, with a unit spec covering mixed, all-`Ready` and drinks-only orders; verify the spec passes
- [x] 2.2 On the manager-visible order detail, disable "Fechar conta" and show the hint "Ainda há itens em preparação" whenever the helper is true, and enable it otherwise; verify the component spec asserts the disabled + hint state for a `Pending`/`Preparing` item and the enabled state once items are `Ready` or never enter the kitchen
- [x] 2.3 Verify (regression) that the waiter still sees no close action and a backend refusal still surfaces verbatim in the close dialog

## 3. Menu items filtered by category

- [x] 3.1 Add the chip row — `Todas` (default) + Pizzas/Pratos/Bebidas/Sobremesas/Acompanhamentos — to the items tab, filtering the fetched list client-side and reusing the labels from `CATEGORY_ORDER`/`categoryLabel`; verify the component spec asserts filtering by a chip and resetting with `Todas`

## 4. Pizzas and dishes always require preparation

- [x] 4.1 Add the rule to `itemFormSchema`: category `PIZZA` or `DISH` with `requiresPreparation` unchecked refuses with the message `Pizzas e pratos exigem "Exige preparo"`; verify unit specs accept PIZZA/DISH checked and drinks unchecked and reject PIZZA/DISH unchecked
- [x] 4.2 Pre-check "Exige preparo" when the manager picks Pizzas or Pratos in the form (box stays editable so unchecking surfaces the message), including on the edit path where the category is locked; verify the form spec asserts the auto-check on category pick

## 5. One edit dialog per item row

- [x] 5.1 Give `ItemFormDialog` an edit mode: opening `Editar` pre-fills name, description, price, "Exige preparo" and the ingredient checkboxes from the item's `ingredientIds`, locks the category, and saves through one update PATCH carrying name, description, price, `requiresPreparation` and `ingredientIds`; verify the dialog spec asserts the pre-fill and the update payload
- [x] 5.2 Collapse the `MenuTab` row actions to `Editar` + `Excluir`: delete `EditItemDialog`, `PriceDialog` and `ItemIngredientsDialog` (with their hooks), moving price and ingredient-link edits into the form; verify `npm run lint`, `npm run build` and the updated component specs pass

## 6. Feature files, docs and archive-time notes

- [x] 6.1 Rewrite `features/02_menu_and_stock.feature` mirroring the `manager-menu-stock` spec deltas: the price and ingredient-link scenarios move onto the single item update, editing happens through one dialog, and scenarios assert the category filter and the Pizzas/Pratos preparation-flag rule
- [x] 6.2 Remove the motive from the cancellation scenarios across `features/03_table_order.feature`, `features/06_cook_profile.feature`, `features/09_cancellation_and_payment.feature` and `features/10_table_management.feature` — the "informing the reason …" When-steps and the "reason recorded in the order history" assertions — keeping scenario outcomes otherwise unchanged
- [x] 6.3 Extend the close scenarios in `features/07_manager_profile.feature` mirroring the `close-table-order` spec: the manager closes once every kitchen item reached "Ready", and the SPA blocks the close (disabled action + hint) while an item is still `Pending`/`Preparing`
- [x] 6.4 Update `.claude/rules/01-project-context.md` mapping notes (menu row: single edit dialog + category filter; order/kitchen rows: cancellations without reason; close row: kitchen gate) and verify the routes table reads consistently
- [x] 6.5 Main-spec Purpose paragraphs cannot change via deltas: the `waiter-table-orders` (cancellations carry no reason), `kitchen-panel` (plain-confirmation cancel) and `delivery-orders` (the advance cycle) Purposes were rewritten directly during the archive pass, so main specs and behavior agree
- [x] 6.6 The `close-table-order` collision with `manager-close-order` was resolved by archiving that change first — it created the capability — and retargeting this change's delta so its two requirements are verbatim `MODIFIED` entries and only "Closing is blocked while items are in preparation" stays `ADDED`; the sync converges as a no-op instead of colliding
