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
