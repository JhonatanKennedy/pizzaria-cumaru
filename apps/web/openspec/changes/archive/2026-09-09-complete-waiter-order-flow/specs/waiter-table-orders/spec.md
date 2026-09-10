# Waiter Table Orders Specification

## ADDED Requirements

### Requirement: Cancel an open table order
The waiter MUST be able to cancel the whole open order from its detail screen, informing a reason. On success the screen MUST return to the tables screen, where the freed table shows without an open order. Refusals from the backend (order no longer open) MUST be displayed verbatim.

#### Scenario: Cancelling an order because the customer gave up
- **WHEN** the waiter cancels the open order of table "5" from its detail screen informing the reason "Customer gave up"
- **THEN** the screen returns to the tables screen and table "5" shows without an open order

#### Scenario: Cancelling without a reason
- **WHEN** the waiter tries to cancel an open order without informing a reason
- **THEN** the order is not cancelled and the dialog shows the validation message "Motivo é obrigatório"

#### Scenario: Backend refuses the cancellation
- **WHEN** the backend refuses the order cancellation
- **THEN** the dialog shows the backend's message verbatim and the order stays open

### Requirement: Cancelled orders render read-only
A cancelled order MUST be recognizable and inert: its status badge reads "Cancelado", it offers no add, cancel or quantity actions, and its items list shows that every item left the order.

#### Scenario: Opening a cancelled order
- **WHEN** a Waiter opens an order whose status is "Cancelled"
- **THEN** the screen shows the "Cancelado" badge, an empty-items notice, no item or add actions, and the total as zero

### Requirement: Adjust an item quantity
While the order is open, the waiter MUST be able to increase or decrease the quantity of an item in single steps from its row. The decrease step MUST be disabled at quantity 1. Adjustment MUST stay available while the item is in preparation. Refusals from the backend (closed or cancelled order) MUST be displayed verbatim.

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
