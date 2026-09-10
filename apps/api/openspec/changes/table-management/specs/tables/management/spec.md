## Purpose

Lets the manager register the restaurant's tables and the waiter see the floor: which tables exist, which are occupied, and the open order running on each one.

## ADDED Requirements

### Requirement: Registering a table
The system SHALL register a table with a unique number greater than zero. Registering a duplicate number SHALL be refused with the message "Table number already exists".

#### Scenario: Manager registers a table
- **WHEN** the manager registers table number "3"
- **THEN** the table appears in the table listing with status free

#### Scenario: Duplicate table number
- **WHEN** the manager registers a table with a number that is already registered
- **THEN** the system refuses the operation with the message "Table number already exists"

#### Scenario: Invalid table number
- **WHEN** the manager registers a table with number zero
- **THEN** the system refuses the operation with the message "Table number must be greater than zero"

### Requirement: Listing the floor
The system SHALL list every registered table with its open local order summary. A table with an open order SHALL carry its `orderId` and running `totalPrice`; a free table SHALL carry no open order.

#### Scenario: Waiter sees free and occupied tables
- **WHEN** table "5" has an open order with items and table "6" has no open order
- **THEN** the listing shows table "5" with the order id and running total of its open order
- **AND** the listing shows table "6" with no open order

### Requirement: Renumbering a table
The system SHALL allow the manager to renumber a registered table. Renumbering to a number already used by another table SHALL be refused with the message "Table number already exists".

#### Scenario: Manager renumbers a table
- **WHEN** the manager renumbers table "3" to "4"
- **THEN** the listing shows the table with number "4"

#### Scenario: Renumbering to a duplicate
- **WHEN** the manager renumbers a table to a number already used by another table
- **THEN** the system refuses the operation with the message "Table number already exists"

### Requirement: Deleting a table
The system SHALL allow the manager to delete a registered table. Deleting a table that has any order SHALL be refused with the message "Cannot delete a table that has orders".

#### Scenario: Manager deletes a free table
- **WHEN** the manager deletes a table that has no orders
- **THEN** the table no longer appears in the listing

#### Scenario: Deleting a table with orders
- **WHEN** the manager deletes a table that has orders
- **THEN** the system refuses the operation with the message "Cannot delete a table that has orders"
