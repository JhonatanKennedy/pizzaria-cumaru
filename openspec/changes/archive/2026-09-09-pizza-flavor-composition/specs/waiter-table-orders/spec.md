## MODIFIED Requirements

### Requirement: Add items with category filters

The detail screen MUST offer the menu grouped by category, honoring availability. A pizza in its size (M = 6 fatias, G = 8 fatias) MAY be composed: the pizza's canvas MAY be split among other available pizza flavors of the same size, each flavor receiving the fatias it occupies, with the selected pizza keeping the remainder.

#### Scenario: Filtering the menu by category
- **WHEN** the waiter selects a category chip (Pizzas, Pratos, Bebidas, Sobremesas or Acompanhamentos)
- **THEN** the panel shows only items of that category

#### Scenario: Unavailable items are blocked
- **WHEN** the menu lists an item as unavailable
- **THEN** the item is shown grayed out as "Indisponível" and cannot be added to the order

#### Scenario: Adding a pizza with flavors
- **WHEN** the waiter selects a pizza and composes one or more flavors for it, giving each flavor its fatias
- **THEN** the added item records the composition and the price follows the backend's multi-flavor rule

#### Scenario: Only available same-size flavors are offered for composing
- **WHEN** a pizza is selected and the waiter starts composing it
- **THEN** the flavor picker offers only PIZZA items of the same size that are available — no other category, no other size, no unavailable item

#### Scenario: Adding an item with quantity and notes
- **WHEN** the waiter adds an item with a quantity and an observation
- **THEN** the order records the quantity and the observation, and the detail screen updates with the new item and total
