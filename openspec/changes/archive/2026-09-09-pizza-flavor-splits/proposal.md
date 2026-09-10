## Why

A split pizza is recorded today only as a list of flavor names (`OrderItem.flavors: String[]`), with no notion of how much of the pizza each flavor occupies. The SPA needs composed pizzas — a pizza of a given size (M = 6 fatias, G = 8 fatias) whose fatias are split among existing pizzas as flavors (e.g. G Mussarela with 2 fatias of Chocolate) — and the kitchen must see that composition. Sizes are not modeled structurally: each pizza is a flat catalog item whose name carries the size ("Mussarela G" / "Mussarela M").

## What Changes

- **BREAKING — add-item payload**: `flavors: string[]` becomes an array of composition entries `{ name, pieces }[]` (pieces of the chosen size's canvas). The single-flavor default becomes the base item alone, whole.
- Storage: `OrderItem.flavors` migrates from `String[]` to a `Json` composition. Legacy rows (dev data) are mapped by convention — a lone name reads as a whole pizza; two names as half/half — to be confirmed in design.
- Validation on add: every flavor must resolve to an existing pizza catalog item, must be of the same size as the base item (convention: the trailing size token in the item name), and must be available (its ingredients in stock — extending today's `assertAvailable`, which checks only the base item).
- Pricing rule unchanged: a composed pizza is priced at the highest price among its flavors (the archived "multi-flavor pizza rule").
- `GET /orders` items and `GET /kitchen/queue` items expose the composition so order screens and kitchen tiles can render "Mussarela 1/2 · Chocolate 1/4" / "4/6 · 2/6" wording.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `orders/order-creation`: the "Split pizza flavors and pricing" requirement gains piece-based portions over a size canvas and the availability rule for flavors (payload shape, same-size resolution).
- `kitchen/kitchen-queue`: queue items must expose the flavor composition.

## Impact

- `src/orders` (add-item DTO/use case, `OrderItems` entity, mapper, repository serialization), `src/kitchen` (queue DTO), Prisma schema + migration, and the affected specs and unit tests.
- Conventions to lock in design: size tokens in pizza item names ("Mussarela G"/"Mussarela M", M = 6, G = 8 fatias), flavor resolution to the base item's size, migration mapping for legacy rows.
- Feeds the sibling repo's `pizza-flavor-composition` SPA change.
