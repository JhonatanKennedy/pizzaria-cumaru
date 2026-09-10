# waiter-table-orders Specification

## Purpose

The waiter's table-order flow: register and manage one order per table, add menu items with category filtering, follow the preparation status of each item, and cancel pending items through a plain confirmation — no reason is collected. Traces to `features/03_table_order.feature`, `05_waiter_profile.feature` and `09_cancellation_and_payment.feature`.

## Requirements

### Requirement: Waiter lands on the tables screen

The waiter's home MUST be the table-order screen; the panel root redirects there.

#### Scenario: Opening the waiter panel
- **WHEN** a Waiter (or Manager) opens `/waiter`
- **THEN** they are redirected to `/waiter/tables`

#### Scenario: Opening the tables screen
- **WHEN** a Waiter opens `/waiter/tables`
- **THEN** the screen lists the day's open local orders as cards, each showing the table number, the responsible waiter, the items with quantities and preparation status, and the order total

### Requirement: Open a new table order

The waiter MUST create one order per table through a single form.

#### Scenario: Opening an order for a free table
- **WHEN** the waiter opens a new order informing the table number
- **THEN** an open local order linked to that table is created and the screen opens the new order's detail

#### Scenario: Missing table number
- **WHEN** the waiter submits the new-table-order form without a table number
- **THEN** the order is not created and the form shows a validation message

### Requirement: Add items with category filters

The detail screen MUST offer the menu grouped by category, honoring availability. A pizza in its size (M = 6 fatias, G = 8 fatias) MAY be composed: the pizza's canvas MAY be split among other available pizza flavors of the same size, each flavor receiving the fatias it occupies, with the selected pizza keeping the remainder.

#### Scenario: Filtering the menu by category
- **WHEN** the waiter selects a category chip (Pizzas, Pratos, Bebidas, Sobremesas or Acompanhamentos)
- **THEN** the panel shows only items of that category

#### Scenario: Unavailable items are blocked
- **WHEN** the menu lists an item as unavailable
- **THEN** the item is shown grayed out as "Indisponível" and cannot be added to the order

#### Scenario: Adding a pizza with flavors
- **WHEN** the waiter selects a pizza and composes one or more flavors for it, giving each flavor its fatias
- **THEN** the added item records the composition and the price follows the backend's multi-flavor rule

#### Scenario: Only available same-size flavors are offered for composing
- **WHEN** a pizza is selected and the waiter starts composing it
- **THEN** the flavor picker offers only PIZZA items of the same size that are available — no other category, no other size, no unavailable item

#### Scenario: Adding an item with quantity and notes
- **WHEN** the waiter adds an item with a quantity and an observation
- **THEN** the order records the quantity and the observation, and the detail screen updates with the new item and total

### Requirement: Follow preparation status

The detail screen MUST reflect what the kitchen is doing with each item.

#### Scenario: Item reaches Ready
- **WHEN** the kitchen finishes preparing an item of an open order
- **THEN** the waiter sees that item with status "Pronto" in the order detail

### Requirement: Removed menu items stay displayable

An item deleted from the menu MUST NOT break the display of an open order that contains it.

#### Scenario: Order contains an item removed from the menu
- **WHEN** an open order contains an item that no longer exists in the menu
- **THEN** the detail screen shows the line as "Item removido do cardápio" and the order remains open with its total intact

### Requirement: Cancel an open table order

The waiter MUST be able to cancel the whole open order from its detail screen through a plain confirmation — no reason is collected and none is sent. On success the screen MUST return to the tables screen, where the freed table shows without an open order. Refusals from the backend (order no longer open) MUST be displayed verbatim.

#### Scenario: Cancelling an order because the customer gave up
- **WHEN** the waiter cancels the open order of table "5" from its detail screen and confirms the cancellation
- **THEN** the screen returns to the tables screen and table "5" shows without an open order

#### Scenario: Cancelling without a reason
- **WHEN** the waiter cancels an open order without informing a reason, since the confirmation does not ask for one
- **THEN** the order is cancelled: the screen returns to the tables screen and the freed table shows without an open order

#### Scenario: Backend refuses the cancellation
- **WHEN** the backend refuses the order cancellation
- **THEN** the dialog shows the backend's message verbatim and the order stays open

### Requirement: Cancelled orders render read-only

A cancelled order MUST be recognizable and inert: its status badge reads "Cancelado", it offers no add, cancel or quantity actions, and its items list shows that every item left the order.

#### Scenario: Opening a cancelled order
- **WHEN** a Waiter opens an order whose status is "Cancelled"
- **THEN** the screen shows the "Cancelado" badge, an empty-items notice, no item or add actions, and the total as zero

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
