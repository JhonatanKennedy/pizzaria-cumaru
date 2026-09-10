# Order Creation Specification

## Purpose

Defines how orders are created — local orders per table and delivery orders with delivery data — and how items, flavors, and observations are added to them.

## Requirements

### Requirement: Creating a local order
The system SHALL create a single open order of type "Local" linked to the given registered table, recording the user who opened it. Creating an order for a table that is not registered SHALL be refused with the message "Table not found".

#### Scenario: Waiter opens a table order
- **WHEN** an order is created for registered table "8"
- **THEN** a single order of type "Local" linked to table "8" is created with status "Open" and the creating user recorded

#### Scenario: Order for an unregistered table
- **WHEN** an order is created for a table that is not registered
- **THEN** the system refuses the creation with the message "Table not found"

### Requirement: One open order per table
A table SHALL have at most one open order. Creating another order for a table that already has an open order SHALL be refused.

#### Scenario: Second order for an occupied table
- **WHEN** an order is created for a table that already has an open order
- **THEN** the system refuses the creation with the message "Table already has an open order"

### Requirement: Different tables keep independent orders
Orders of different tables SHALL NOT affect each other.

#### Scenario: Adding to one table's order
- **WHEN** an item is added to the open order of table "5" while table "6" also has an open order
- **THEN** the order of table "6" is not changed

### Requirement: Creating a delivery order
The system SHALL create an open order of type "Delivery" with the customer name, contact phone, and delivery address. A delivery order SHALL NOT be linked to any table. Creating a delivery order without an address SHALL be refused with the message "Delivery address is required for delivery".

#### Scenario: Waiter creates a delivery order
- **WHEN** a delivery order is created for the customer "Maria Souza" with contact phone "(81) 99999-0000" and a delivery address
- **THEN** an order of type "Delivery" with status "Open" is created and it is not linked to any table

#### Scenario: Delivery order without an address
- **WHEN** a delivery order is created without informing the address
- **THEN** the system refuses the creation with the message "Delivery address is required for delivery"

### Requirement: Adding items over time
The system SHALL add items to an open order at any moment during the service, each item recording its quantity and the unit price of the catalog item at the moment it was added.

#### Scenario: Waiter adds three items over time
- **WHEN** the waiter adds a pizza "Calabresa", later a "Água", and even later a dish "Parmegiana de Frango" to the same open order
- **THEN** the order contains the 3 items added and remains the only order for the table

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

### Requirement: Item observations
The system SHALL allow an item added to an order to record an observation.

#### Scenario: Pizza with an observation
- **WHEN** a pizza "Mussarela" is added with the observation "no onions, stuffed crust"
- **THEN** the recorded item contains the observation "no onions, stuffed crust"

### Requirement: Closed orders refuse new items
Adding an item to a closed order SHALL be refused with the message "Cannot change a closed order".

#### Scenario: Item added to a closed order
- **WHEN** an item is added to an order with status "Closed"
- **THEN** the system refuses the operation with the message "Cannot change a closed order"

### Requirement: Unavailable items cannot be added
An item whose required ingredients are unavailable in stock SHALL NOT be added to an order, and neither SHALL any flavor composing it.

#### Scenario: Adding an item with a missing ingredient
- **WHEN** the ingredient "Mussarela" is unavailable and a pizza "Mussarela" is added to an order
- **THEN** the system refuses the operation with the message "Item is unavailable"

#### Scenario: Adding a pizza with an unavailable flavor
- **WHEN** the ingredient "Mussarela" is unavailable and a pizza is added composed with the flavor "Mussarela G"
- **THEN** the system refuses the operation with the message "Item is unavailable"
