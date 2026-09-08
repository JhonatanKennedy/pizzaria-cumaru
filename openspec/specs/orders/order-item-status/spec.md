# Order Item Status Specification

## Purpose

Defines the preparation status lifecycle of order items, the cancellation rules, and the creation timestamps that other capabilities (such as the kitchen queue) rely on for arrival ordering.

## Requirements

### Requirement: Prepared items start as Pending
When an item that requires preparation is added to an open order, the system SHALL create it with status "Pending".

#### Scenario: Prepared item added to an open order
- **WHEN** a pizza that requires preparation is added to an open order
- **THEN** the item's status is "Pending"

### Requirement: Non-prepared items have no preparation status
When an item that does not require preparation is added to an open order, the system SHALL NOT assign it a preparation status.

#### Scenario: Drink added to an open order
- **WHEN** a drink that does not require preparation is added to an open order
- **THEN** the item has no preparation status

### Requirement: Starting preparation
The system SHALL transition an item from status "Pending" to status "Preparing" when preparation is started. Starting an item with any other status (or no status) SHALL be refused.

#### Scenario: Start preparation on a pending item
- **WHEN** preparation is started on an item with status "Pending"
- **THEN** the item's status becomes "Preparing"

#### Scenario: Start preparation on a preparing item
- **WHEN** preparation is started on an item with status "Preparing"
- **THEN** the system refuses the operation

### Requirement: Preparing is required before Ready
The system SHALL transition an item from status "Preparing" to status "Ready" when preparation is confirmed finished. Confirming an item that is not "Preparing" SHALL be refused.

#### Scenario: Confirm a preparing item
- **WHEN** preparation of an item with status "Preparing" is confirmed finished
- **THEN** the item's status becomes "Ready"

#### Scenario: Confirm a pending item
- **WHEN** preparation of an item with status "Pending" is confirmed finished
- **THEN** the system refuses the operation

### Requirement: Finishing one item leaves the order and other items untouched
Confirming one item finished SHALL NOT close the order and SHALL NOT change the status of the order's other items.

#### Scenario: One of two pending-prepared items is started and finished
- **WHEN** preparation of one item is started and then confirmed finished while a second item remains "Pending"
- **THEN** the finished item's status is "Ready", the second item's status stays "Pending", and the order as a whole stays "Open"

### Requirement: Cancellation of prepared items
The system SHALL cancel a prepared item only while its status is "Pending". On cancellation the item SHALL be removed from the order and the reason SHALL be recorded in the order's history. Cancelling an item with status "Preparing" or "Ready" SHALL be refused with the message "Cannot cancel an item in preparation". A reason is required; cancelling without a reason SHALL be refused.

#### Scenario: Cancel a pending prepared item
- **WHEN** a prepared item with status "Pending" is cancelled with the reason "Customer gave up"
- **THEN** the item is removed from the order and the order history records the cancellation with the reason "Customer gave up"

#### Scenario: Cancel an item in preparation
- **WHEN** a prepared item with status "Preparing" is cancelled
- **THEN** the system refuses the operation with the message "Cannot cancel an item in preparation"

#### Scenario: Cancel without a reason
- **WHEN** an item is cancelled without informing a reason
- **THEN** the system refuses the operation

### Requirement: Cancellation of non-prepared items
The system SHALL cancel an item that does not require preparation at any moment while the order is open, regardless of the progress of the order's other items.

#### Scenario: Cancel a drink while other items are being prepared
- **WHEN** a drink is cancelled while a pizza in the same order has status "Preparing"
- **THEN** the drink is removed from the order

### Requirement: No changes to closed orders
The system SHALL refuse to cancel or change items of a closed order.

#### Scenario: Cancel an item of a closed order
- **WHEN** an item of a closed order is cancelled
- **THEN** the system refuses the operation

### Requirement: Cancellation history
The order SHALL keep a history of every cancelled item, recording the item, the reason, and the cancellation time.

#### Scenario: Two cancellations on one order
- **WHEN** two items of the same order are cancelled with different reasons
- **THEN** the order history records both cancellations, each with its item, reason, and time

### Requirement: Creation timestamps
The system SHALL record a creation timestamp when an order is created and when each item is added to an order.

#### Scenario: Order and items record their creation time
- **WHEN** an order is created and an item is added to it later
- **THEN** the order records the time it was created and the item records the time it was added
