## MODIFIED Requirements

### Requirement: Split pizza flavors and pricing

A pizza item MAY be composed of multiple flavors, each recorded with the number of fatias it occupies on the pizza, the base flavor included. The fatia counts MUST sum to the chosen size's canvas — M pizzas have 6 fatias, G pizzas 8. Pizza items are registered per size as flat catalog entries whose names carry a trailing size token ("Mussarela G" / "Mussarela M"), and a composed pizza's flavors MUST be existing pizza items of the same size as its base item. A composed pizza SHALL be priced at the highest price among its flavors.

#### Scenario: Split pizza with two flavors
- **WHEN** a pizza split with the flavors "Calabresa" and "Portuguesa" is added, each flavor taking half the canvas
- **THEN** the pizza item records the composition with each flavor and its fatias, and its unit price is the higher of the two flavors' prices

#### Scenario: Composing a pizza with pieces of another flavor
- **WHEN** a G pizza "Mussarela" is added composed with 2 fatias of the flavor "Chocolate G"
- **THEN** the pizza item records the composition Mussarela 6 fatias + Chocolate G 2 fatias (8 fatias total) and its unit price is the higher of the two flavors' prices

#### Scenario: Flavor pieces must cover the pizza
- **WHEN** a pizza is added whose composition fatia counts do not sum to the chosen size's canvas
- **THEN** the system refuses the operation with the message "Flavor pieces must sum to the pizza size"

#### Scenario: A flavor of another size is refused
- **WHEN** an M pizza is composed with a flavor item that carries the G size token
- **THEN** the system refuses the operation with the message "Flavor must match the pizza size"

#### Scenario: An unregistered flavor is refused
- **WHEN** a pizza is composed with a flavor that is not a registered pizza item
- **THEN** the system refuses the operation with the message "Flavor is not a registered pizza"

### Requirement: Unavailable items cannot be added

An item whose required ingredients are unavailable in stock SHALL NOT be added to an order, and neither SHALL any flavor composing it.

#### Scenario: Adding an item with a missing ingredient
- **WHEN** the ingredient "Mussarela" is unavailable and a pizza "Mussarela" is added to an order
- **THEN** the system refuses the operation with the message "Item is unavailable"

#### Scenario: Adding a pizza with an unavailable flavor
- **WHEN** the ingredient "Mussarela" is unavailable and a pizza is added composed with the flavor "Mussarela G"
- **THEN** the system refuses the operation with the message "Item is unavailable"
