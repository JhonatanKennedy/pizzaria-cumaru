## RENAMED Requirements

- FROM: `### Requirement: Updating an item price`
- TO: `### Requirement: Updating an item`

## MODIFIED Requirements

### Requirement: Updating an item
The system SHALL update an item through a single request that MAY change its name, description, price, preparation flag and ingredient links (replacing them wholesale); the dedicated price-only update endpoint SHALL be retired and price changes go through this update. New orders with that item SHALL use the updated values. A negative price SHALL be refused with the message "Price cannot be negative". The category of an item SHALL stay fixed at creation: the update contract does not accept it.

#### Scenario: Manager updates a pizza price
- **WHEN** the price of the pizza "Calabresa" is changed to "R$ 45.00" through the item update
- **THEN** new orders with the pizza "Calabresa" consider the value "R$ 45.00"

#### Scenario: Negative price
- **WHEN** an item's price is changed to a negative value
- **THEN** the system refuses the operation with the message "Price cannot be negative"

#### Scenario: Updating everything in one request
- **WHEN** an item is updated changing its name, description, price, preparation flag and ingredient list at once
- **THEN** the item reflects all of those changes after the single request, and new orders use the updated values

#### Scenario: The category stays fixed at creation
- **WHEN** an item is updated through any request
- **THEN** the item keeps the category it was created with
