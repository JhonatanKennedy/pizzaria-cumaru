## Why

Splitting a pizza today means typing flavor names into a free-text field ("Sabores separados por vírgula"): no notion of pieces or sizes, nothing validated against the catalog, and the composition is never displayed on the order line or sent to the kitchen. The product needs a composed pizza: pick a pizza in its size (M = 6 fatias, G = 8 fatias), then give pieces of it to other flavors (e.g. a G Mussarela with 2 fatias of Chocolate → Mussarela 6/8 · Chocolate 2/8), with only available pizzas as flavor choices.

## What Changes

- **BREAKING — add-item payload**: the flavor field moves from plain `string[]` names to composition entries with piece counts (`{ name, pieces }[]`, summed against the chosen size's canvas). Depends on the backend contract change `pizza-flavor-splits` in the sibling `pizzaria-cumaru-backend` repo.
- The free-text "Sabores" field is replaced by a flavor composer in both add-item panels (waiter `AddItemPanel` and manager delivery `AddItemsPanel`): the canvas shows the size's fatias, flavors are picked among **available** pizza items of the same size, pieces are allocated per flavor (the base pizza keeps the remainder), unavailable pizzas are not offered.
- Order lines (waiter order detail, delivery detail) and kitchen tiles render the composition, e.g. "Mussarela 1/2 · Chocolate 1/4" on G and "4/6 · 2/6" wording on M, in pt-BR.
- The composition rules are pure TS shared from `@lib` (canvas sizes per item size token, piece allocation, fraction/pieces formatting) with unit tests; the order contract schemas in `@api/orders.api.ts` are extended to carry the composition.

## Capabilities

### New Capabilities

- `delivery-orders`: flavor composition when adding items to delivery orders (the delivery add flow currently has no spec capability; this requirement starts one).

### Modified Capabilities

- `waiter-table-orders`: the add-items requirement gains composed pizzas — piece-based multi-flavor with size canvases, only available same-size pizzas as flavors, price rule unchanged (the highest flavor price wins, per the backend rule).
- `kitchen-panel`: kitchen tiles must display the item's flavor composition, not only its name and notes.

## Impact

- Waiter and manager-delivery add panels, both order-detail screens, the kitchen `ItemTile`, the shared order/catalog schemas (`@api/orders.api.ts`, `@api/catalog.api.ts`) and new `@lib` business modules.
- Convention to lock in design: pizza items are registered per size as flat catalog entries whose names carry a trailing size token ("Mussarela G" / "Mussarela M"); flavors resolve to the same-size item, which prices by the existing highest-flavor rule and gates availability.
- Blocked on the sibling repo change `pizza-flavor-splits` (payload shape, storage, migration, kitchen-queue exposure).
