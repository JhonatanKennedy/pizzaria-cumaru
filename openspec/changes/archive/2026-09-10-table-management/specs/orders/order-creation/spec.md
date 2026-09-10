## MODIFIED Requirements

### Requirement: Creating a local order
The system SHALL create a single open order of type "Local" linked to the given registered table, recording the user who opened it. Creating an order for a table that is not registered SHALL be refused with the message "Table not found".

#### Scenario: Waiter opens a table order
- **WHEN** an order is created for registered table "8"
- **THEN** a single order of type "Local" linked to table "8" is created with status "Open" and the creating user recorded

#### Scenario: Order for an unregistered table
- **WHEN** an order is created for a table that is not registered
- **THEN** the system refuses the creation with the message "Table not found"
