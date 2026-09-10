## Purpose

Defines how the manager keeps the menu and the ingredient stock up to date: marking ingredients unavailable or available, updating prices, and the listings that expose availability.

## ADDED Requirements

### Requirement: Marking an ingredient unavailable
The system SHALL mark an ingredient unavailable in stock. Every item that depends on it SHALL become unavailable: it is hidden from the kitchen queues and cannot be added to orders.

#### Scenario: Manager marks an ingredient as missing
- **WHEN** the ingredient "Mussarela" is marked unavailable in stock
- **THEN** all menu items that depend on "Mussarela" become unavailable, disappear from the kitchen queue, and cannot be added to orders

### Requirement: Restoring an ingredient
The system SHALL mark an ingredient available again. Items that depend on it SHALL become available again.

#### Scenario: Manager restores the availability
- **WHEN** the ingredient "Mussarela" is marked available again
- **THEN** the items that depend on "Mussarela" appear again for the waiter and in the kitchen queue and can be added to orders again

### Requirement: Updating an item price
The system SHALL update an item's price. New orders with that item SHALL use the new price. A negative price SHALL be refused.

#### Scenario: Manager updates a pizza price
- **WHEN** the price of the pizza "Calabresa" is changed to "R$ 45.00"
- **THEN** new orders with the pizza "Calabresa" consider the value "R$ 45.00"

#### Scenario: Negative price
- **WHEN** an item's price is changed to a negative value
- **THEN** the system refuses the operation with the message "Price cannot be negative"

### Requirement: Menu listing with availability
The menu listing SHALL include, for each item, whether it is currently available. An item is available only when every ingredient it depends on is available in stock.

#### Scenario: Waiter opens the new order screen
- **WHEN** the ingredient "Mussarela" is unavailable and the menu is listed
- **THEN** the pizza "Mussarela" appears marked as "Unavailable" and every item not depending on "Mussarela" appears available

### Requirement: Ingredient listing
The ingredient listing SHALL include each ingredient with its current availability.

#### Scenario: Listing ingredients after a stock change
- **WHEN** the ingredient "Mussarela" has been marked unavailable and the ingredients are listed
- **THEN** "Mussarela" is listed as unavailable and the other ingredients keep their availability
