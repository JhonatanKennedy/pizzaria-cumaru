## MODIFIED Requirements

### Requirement: Cancel a pending item

Items MUST be removable from an open order while they have not started preparation: a preparation item still `Pending`, or an item that never requires preparation (drinks, desserts served as-is — they carry no kitchen status), removable at any moment, regardless of the progress of the other items. Items whose preparation started MUST offer no cancellation action in the detail screen, and the backend refusal is shown verbatim.

#### Scenario: Cancelling a pending item with a reason
- **WHEN** the waiter cancels a Pending item informing a reason
- **THEN** the item is removed from the order and the reason is recorded in the order history

#### Scenario: Cancelling an item that never requires preparation
- **WHEN** an open order contains an item that never enters the kitchen flow (it has no status) and the waiter cancels it informing a reason
- **THEN** the item is removed from the order at any moment, even while other items of the order are being prepared, and the reason is recorded in the order history

#### Scenario: No cancellation for items in preparation
- **WHEN** an item requires preparation and is no longer `Pending` (it is `Preparing` or `Ready`)
- **THEN** the detail screen offers no cancellation action for it
