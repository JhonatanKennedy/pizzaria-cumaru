# waiter-table-orders Specification

## Purpose

The waiter's table-order flow: register and manage one order per table, add menu items with category filtering, follow the preparation status of each item, and cancel pending items with a reason. Traces to `features/03_table_order.feature`, `05_waiter_profile.feature` and `09_cancellation_and_payment.feature`.

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

The detail screen MUST offer the menu grouped by category, honoring availability.

#### Scenario: Filtering the menu by category
- **WHEN** the waiter selects a category chip (Pizzas, Pratos, Bebidas, Sobremesas or Acompanhamentos)
- **THEN** the panel shows only items of that category

#### Scenario: Unavailable items are blocked
- **WHEN** the menu lists an item as unavailable
- **THEN** the item is shown grayed out as "Indisponível" and cannot be added to the order

#### Scenario: Adding a pizza with flavors
- **WHEN** the waiter selects a pizza and informs one or more flavors
- **THEN** the added item records the informed flavors (the price follows the backend's multi-flavor rule)

#### Scenario: Adding an item with quantity and notes
- **WHEN** the waiter adds an item with a quantity and an observation
- **THEN** the order records the quantity and the observation, and the detail screen updates with the new item and total

### Requirement: Follow preparation status

The detail screen MUST reflect what the kitchen is doing with each item.

#### Scenario: Item reaches Ready
- **WHEN** the kitchen finishes preparing an item of an open order
- **THEN** the waiter sees that item with status "Pronto" in the order detail

### Requirement: Cancel a pending item

Mistaken items MUST be removable while the order is open and the item has not started preparation.

#### Scenario: Cancelling a pending item with a reason
- **WHEN** the waiter cancels a Pending item informing a reason
- **THEN** the item is removed from the order and the reason is recorded in the order history

#### Scenario: No cancellation for items in preparation
- **WHEN** an item is not Pending
- **THEN** the detail screen offers no cancellation action for it

### Requirement: Removed menu items stay displayable

An item deleted from the menu MUST NOT break the display of an open order that contains it.

#### Scenario: Order contains an item removed from the menu
- **WHEN** an open order contains an item that no longer exists in the menu
- **THEN** the detail screen shows the line as "Item removido do cardápio" and the order remains open with its total intact

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
