# Order Creation Specification

## Purpose

Defines how orders are created — local orders per table and delivery orders with delivery data — and how items, flavors, and observations are added to them.

## Requirements

### Requirement: Creating a local order
The system SHALL create a single open order of type "Local" linked to the given table, recording the user who opened it.

#### Scenario: Waiter opens a table order
- **WHEN** an order is created for table "8"
- **THEN** a single order of type "Local" linked to table "8" is created with status "Open" and the creating user recorded

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
A pizza item MAY record multiple flavors. A split pizza SHALL be priced at the highest price among its flavors.

#### Scenario: Split pizza with two flavors
- **WHEN** a pizza split with the flavors "Calabresa" and "Portuguesa" is added
- **THEN** the pizza item records the flavors "Calabresa, Portuguesa" and its unit price is the higher of the two flavors' prices

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
An item whose required ingredients are unavailable in stock SHALL NOT be added to an order.

#### Scenario: Adding an item with a missing ingredient
- **WHEN** the ingredient "Mussarela" is unavailable and a pizza "Mussarela" is added to an order
- **THEN** the system refuses the operation with the message "Item is unavailable"
