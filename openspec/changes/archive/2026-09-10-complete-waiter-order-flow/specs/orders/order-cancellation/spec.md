# Order Cancellation Specification

## Purpose

Defines how a waiter (or manager) cancels a whole open table order — the customer gave up or the order is wrong — cascading over every remaining item and freeing the table for a new order. No reason is collected: the confirmation is plain. Traces to `features/09_cancellation_and_payment.feature` (whole-order scenario) and `features/10_table_management.feature` (table freed).

## ADDED Requirements

### Requirement: Cancelling an open table order
A waiter or manager SHALL cancel an open local order through a plain confirmation carrying no reason. The cancellation SHALL remove every remaining item from the order — regardless of each item's preparation status — set the order status to "Cancelled", and record the cancellation time on the order.

#### Scenario: Customer gives up while a pizza is in preparation
- **WHEN** the waiter cancels the open order of table "5" — containing a pizza with status "Preparing" and a drink
- **THEN** the order status becomes "Cancelled", no items remain on it, and the order records the cancellation time

#### Scenario: Cancelling an order that already has a finished item
- **WHEN** the waiter cancels an open order that contains a pizza with status "Ready" and a pending dish
- **THEN** both items leave the order and the order status becomes "Cancelled"

#### Scenario: Cancelling an empty open order
- **WHEN** the waiter cancels an open order that has no items
- **THEN** the order status becomes "Cancelled"

#### Scenario: Cancelling without a reason
- **WHEN** the waiter cancels an open order, since the confirmation does not ask for a reason
- **THEN** the order is cancelled and the order records no reason

### Requirement: Only open orders can be cancelled
An order SHALL be cancellable only while its status is "Open". Cancelling a closed order SHALL be refused with the message "Cannot change a closed order"; cancelling an order in any other non-open status SHALL be refused with the message "Only open orders can be cancelled".

#### Scenario: Cancelling a closed order
- **WHEN** a closed order is cancelled
- **THEN** the system refuses the operation with the message "Cannot change a closed order"

#### Scenario: Cancelling a delivery order already in the delivery cycle
- **WHEN** a delivery order with status "Out for delivery" is cancelled
- **THEN** the system refuses the operation with the message "Only open orders can be cancelled"

### Requirement: A cancelled order frees its table
A cancelled order SHALL NOT count as the table's open order. The waiter SHALL be able to open a new order for the same table, and the floor listing SHALL show the table as free (no open order).

#### Scenario: Opening a new order after a cancellation
- **WHEN** the waiter cancels the open order of table "5" and then opens a new order for table "5"
- **THEN** a new open local order linked to table "5" is created

#### Scenario: Floor listing after a cancellation
- **WHEN** the waiter lists the tables after cancelling the open order of table "5"
- **THEN** the listing shows table "5" with no open order

### Requirement: Cancelled orders reject item changes
Adding, cancelling or adjusting items of a cancelled order SHALL be refused with the message "Cannot change a cancelled order". Closing a cancelled order SHALL be refused with the message "Cannot close a cancelled order".

#### Scenario: Adding an item to a cancelled order
- **WHEN** an item is added to an order with status "Cancelled"
- **THEN** the system refuses the operation with the message "Cannot change a cancelled order"

#### Scenario: Closing a cancelled order
- **WHEN** a manager tries to close an order with status "Cancelled"
- **THEN** the system refuses the operation with the message "Cannot close a cancelled order"
