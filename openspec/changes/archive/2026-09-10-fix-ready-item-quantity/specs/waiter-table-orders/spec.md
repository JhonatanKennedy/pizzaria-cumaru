## MODIFIED Requirements

### Requirement: Adjust an item quantity

While the order is open, the waiter MUST be able to increase or decrease the quantity of an item in single steps from its row. The decrease step MUST be disabled at quantity 1. Adjustment MUST stay available while the item is in preparation. Increasing MUST NOT be available once the item has reached "Ready": the kitchen has finished it, and an increase at that point would bill the guest for a portion that never enters the kitchen queue. Decreasing a "Ready" item stays available. Refusals from the backend (closed or cancelled order, increasing a finished item) MUST be displayed verbatim.

#### Scenario: Increasing an item quantity
- **WHEN** the waiter presses the increase step on an item with quantity "2"
- **THEN** the row shows quantity "3" and the order total reflects the new quantity

#### Scenario: Decreasing an item quantity
- **WHEN** the waiter presses the decrease step on an item with quantity "2"
- **THEN** the row shows quantity "1"

#### Scenario: No decrease below one
- **WHEN** an item has quantity "1"
- **THEN** the decrease step is disabled on that row

#### Scenario: Adjusting an item that is in preparation
- **WHEN** the waiter presses the increase step on an item the kitchen is preparing
- **THEN** the row shows the increased quantity and the item keeps its preparation status

#### Scenario: Backend refuses the adjustment
- **WHEN** the backend refuses a quantity adjustment
- **THEN** the screen shows the backend's message verbatim and the item keeps its current quantity

#### Scenario: Increasing an item the kitchen has finished
- **WHEN** an item of an open order has reached the "Ready" status
- **THEN** the increase step is disabled on that row, while the decrease step stays enabled

#### Scenario: Backend refuses an increase on a finished item
- **WHEN** the backend receives a request to increase the quantity of an item that has reached the "Ready" status
- **THEN** the change is refused and the item keeps its current quantity
