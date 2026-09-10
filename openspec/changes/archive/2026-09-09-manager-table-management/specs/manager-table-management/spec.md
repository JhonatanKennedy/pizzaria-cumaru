## Purpose

The manager's table-management screen: register, renumber and remove floor tables, keeping the floor that waiters and cooks work from up to date. Traces to `features/10_table_management.feature`.

## ADDED Requirements

### Requirement: Manager reaches the table-management screen

The manager hub MUST link to a table screen at `/manager/tables` guarded for the Manager role; other roles MUST be denied.

#### Scenario: Manager opens the tables screen
- **WHEN** a Manager opens `/manager/tables` from the hub
- **THEN** the screen lists every table with its number and free/occupied state (the open order's total when occupied)

#### Scenario: A Waiter is denied the tables screen
- **WHEN** a Waiter tries to open `/manager/tables`
- **THEN** the access-denied screen is shown

### Requirement: Register a table

The screen MUST offer registering a new table by its number. On success the list MUST show the new table as free; a duplicate number MUST be refused and the backend's message displayed verbatim.

#### Scenario: Registering a free table
- **WHEN** the manager registers table "11"
- **THEN** the list shows table "11" as free

#### Scenario: Registering a duplicate table number
- **WHEN** the manager registers a table number that already exists
- **THEN** the operation is refused, the backend message is displayed verbatim and the list does not change

### Requirement: Renumber a table

The screen MUST offer changing a table's number. On success the list MUST show the table under its new number; a duplicate target number MUST be refused with the backend's message verbatim.

#### Scenario: Renumbering a table
- **WHEN** the manager renumbers table "11" to "12"
- **THEN** the list shows the table as "12"

#### Scenario: Renumbering to a duplicate number
- **WHEN** the manager renumbers a table to a number that already exists
- **THEN** the operation is refused, the backend message is displayed verbatim and the list does not change

### Requirement: Remove a table

The screen MUST offer removing a table after an explicit confirmation, and only when the backend accepts the removal — a table that has orders MUST be refused with the backend's message verbatim.

#### Scenario: Removing a free table
- **WHEN** the manager confirms the removal of a free table
- **THEN** the table disappears from the list

#### Scenario: Removing a table that has orders is refused
- **WHEN** the manager tries to remove a table that has orders
- **THEN** the operation is refused, the backend message is displayed verbatim and the table stays listed
