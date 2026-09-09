## Why

The last polish round for the SPA: a table cannot be closed while the kitchen is still preparing its items (nothing enforces this today, so a manager can bill a table whose pizza is not even in the oven), the manager's menu screen cannot be browsed by category, every cancellation demands a motive the operator often does not have, a pizza or dish registered without "Exige preparo" silently never reaches the kitchen queue, and editing an item is scattered across three small dialogs instead of one form like the one used to create it.

## What Changes

- **Close gate on kitchen progress**: while any item of an open local order is still `Pending` or `Preparing`, closing the order is refused — the backend answers with a verbatim refusal (see the sibling backend change) and the manager's "Fechar conta" button is disabled with an explanatory hint.
- **Menu items filterable by category**: the items tab of the Menu screen gains the category chips (Todas, Pizzas, Pratos, Bebidas, Sobremesas, Acompanhamentos), filtering the listed items client-side.
- **Cancellations stop asking for a motive**: the three cancel flows — order-detail item cancel, kitchen "Cancelar preparo", whole-order cancel — become plain confirmations; no Motivo field, no "Motivo é obrigatório" validation, no reason sent. **BREAKING** for the cancellation payloads (backend counterpart in `order-and-catalog-polish`).
- **PIZZA/DISH must require preparation**: registering or editing an item of category PIZZA or DISH forces "Exige preparo" checked — the checkbox pre-checks itself when such a category is picked, and submission is refused with a validation message if it is unchecked.
- **One edit dialog per item**: the row's `Editar`, `Preço` and `Ingredientes` buttons collapse into a single `Editar` that opens the item form pre-filled (name, description, price, requiresPreparation, ingredient checkboxes; category locked). Row actions become `Editar` + `Excluir`. **BREAKING** for the item update payloads (richer PATCH in the backend counterpart).

## Capabilities

### New Capabilities

- `close-table-order`: the manager's close-order flow (payment method, freed table, waiter sees no action) was designed and implemented under the still-active `manager-close-order` change but its delta was never synced into the main specs — no such capability exists there. This change creates it, carrying that change's requirements verbatim (so its later archive converges instead of colliding) plus the new kitchen-progress gate requirement.

### Modified Capabilities

- `waiter-table-orders`: item cancellation and whole-order cancellation no longer collect a reason.
- `kitchen-panel`: "Cancelar preparo" no longer collects a required reason.
- `manager-menu-stock`: menu listing filterable by category; PIZZA/DISH registration and editing require the preparation flag; item editing moves to a single full dialog replacing the separate rename/description and price flows.

## Impact

- **Screens**: `manager/pages/menu` items tab (`MenuTab`, category chips), `manager/components/ItemFormDialog` reused for editing (defaults, schema, save orchestration), `manager/components/EditItemDialog`, `PriceDialog` and the per-row `Ingredientes` action removed, waiter order detail close gating and confirm-only cancel dialogs, kitchen `CancelPreparationDialog` confirm-only.
- **Shared code**: `lib/cancellation.ts` deleted (no caller left); `itemFormSchema` grows the prep-flag rule; a small pure predicate for the close gate.
- **Contracts consumed**: cancellation payloads lose `reason`; the item update payload accepts more fields — provided by the sibling backend change `order-and-catalog-polish` (ships in tandem; frontend must not land first).
- **Product specs**: `features/02_menu_and_stock.feature`, `06_cook_profile.feature`, `07_manager_profile.feature` and `09_cancellation_and_payment.feature` rewritten for the new rules.
- **Tests**: dialog specs lose the Motivo cases and gain confirm-only behavior; the close gate (disabled + hint), the category filter and the row-action consolidation get component coverage; the schema rule gets unit coverage.
