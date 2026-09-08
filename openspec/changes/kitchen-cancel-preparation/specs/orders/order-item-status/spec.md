## MODIFIED Requirements

### Requirement: Cancellation of prepared items
The system SHALL cancel a prepared item through the order-side cancellation only while its status is "Pending"; on cancellation the item SHALL be removed from the order and the reason SHALL be recorded in the order's history. An item whose status is "Preparing" SHALL be cancellable by the kitchen panel or by a Manager, with the same removal and history recording. An item in preparation SHALL NOT be cancellable through the order-side cancellation, which SHALL refuse with the message "Cannot cancel an item in preparation". An item whose status is "Ready" SHALL NOT be cancellable through either path. A reason is required for every cancellation; cancelling without a reason SHALL be refused.

#### Scenario: Cancel a pending prepared item
- **WHEN** a prepared item with status "Pending" is cancelled with the reason "Customer gave up"
- **THEN** the item is removed from the order and the order history records the cancellation with the reason "Customer gave up"

#### Scenario: Cancel an item in preparation
- **WHEN** a prepared item with status "Preparing" is cancelled
- **THEN** the system refuses the operation with the message "Cannot cancel an item in preparation"

#### Scenario: Cancel an item in preparation from the kitchen
- **WHEN** the kitchen panel or a Manager cancels a prepared item with status "Preparing", informing the reason "Wrong dish started"
- **THEN** the item is removed from the order, leaves the kitchen queue, and the order history records the cancellation with the reason "Wrong dish started"

#### Scenario: Cancel a ready item
- **WHEN** an item with status "Ready" is cancelled through the kitchen panel or through the order-side cancellation
- **THEN** the system refuses the operation

#### Scenario: Cancel without a reason
- **WHEN** an item is cancelled without informing a reason
- **THEN** the system refuses the operation
