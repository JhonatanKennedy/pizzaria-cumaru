## MODIFIED Requirements

### Requirement: Cancellation of prepared items
The system SHALL cancel a prepared item only while its status is "Pending". On cancellation the item SHALL be removed from the order. Cancelling an item with status "Preparing" or "Ready" SHALL be refused with the message "Cannot cancel an item in preparation". A reason SHALL NOT be required: the cancellation request carries none, and cancelling without one succeeds.

#### Scenario: Cancel a pending prepared item
- **WHEN** a prepared item with status "Pending" is cancelled
- **THEN** the item is removed from the order

#### Scenario: Cancel an item in preparation
- **WHEN** a prepared item with status "Preparing" is cancelled
- **THEN** the system refuses the operation with the message "Cannot cancel an item in preparation"

#### Scenario: Cancel without a reason
- **WHEN** an item is cancelled without informing a reason
- **THEN** the cancellation succeeds and the item is removed from the order

### Requirement: Cancellation history
The order SHALL keep a history of every cancelled item, recording the item and the cancellation time.

#### Scenario: Two cancellations on one order
- **WHEN** two items of the same order are cancelled
- **THEN** the order history records both cancellations, each with its item and time
