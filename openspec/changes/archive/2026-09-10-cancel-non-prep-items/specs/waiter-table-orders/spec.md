## MODIFIED Requirements

### Requirement: Cancelling a pending item

A mistaken item MUST be removable from an open order while it is `Pending`, and also while it has no preparation status at all: an item that never requires preparation (drinks, desserts served as-is) carries no kitchen status, so it stays cancellable at any moment, even while other items of the order are being prepared. The confirmation MUST NOT ask for a reason. Items with status `Preparing` or `Ready` MUST offer no cancellation action on the detail screen.

#### Scenario: Cancelling a pending item
- **WHEN** the waiter cancels a Pending item through the plain confirmation
- **THEN** the item is removed from the order and no reason is collected

#### Scenario: Cancelling an item that never requires preparation
- **WHEN** an open order contains an item that never enters the kitchen flow (it has no status) and the waiter cancels it
- **THEN** the item is removed from the order at any moment, even while other items of the order are being prepared

#### Scenario: No cancellation for items in preparation
- **WHEN** an item has status "Preparing" or "Ready"
- **THEN** the detail screen offers no cancellation action for it
