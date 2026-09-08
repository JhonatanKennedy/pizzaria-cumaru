# Kitchen Queue Specification

## Purpose

Defines the kitchen panel read model: the two arrival-ordered queues of orders the cook prepares, filtered to prepared items, shaped by stock availability, and marked by preparation status.

## Requirements

### Requirement: Two queues by order type
The kitchen panel SHALL present two queues: a "Delivery" queue containing open delivery orders and a "Local" queue containing open local orders.

#### Scenario: Orders split by type
- **WHEN** there is an open delivery order and an open local order
- **THEN** the panel shows the delivery order in the "Delivery" queue and the local order in the "Local" queue

### Requirement: Arrival ordering
Each queue SHALL list its orders in arrival order, earliest first. Within an order, items SHALL be listed in the order they were added.

#### Scenario: Delivery registered before two tables
- **WHEN** a delivery order is registered before a table order, and that table order before a second table order
- **THEN** the "Delivery" queue lists the delivery order first, and the "Local" queue lists the two table orders in their registration order

### Requirement: Preparation-only items
An item that does not require preparation SHALL NOT appear in either queue.

#### Scenario: Order with pizza, dish, and drink
- **WHEN** an order contains a pizza, a dish, and a drink
- **THEN** only the pizza and the dish appear in the panel

### Requirement: Items hidden when an ingredient is unavailable
When an ingredient is marked unavailable, no item that depends on that ingredient SHALL appear in either queue. Items become visible again when the ingredient is marked available.

#### Scenario: Ingredient goes out of stock
- **WHEN** the ingredient "Mussarela" is unavailable
- **THEN** no item that depends on "Mussarela" appears in either queue

#### Scenario: Ingredient returns to stock
- **WHEN** the ingredient "Mussarela" is marked available again
- **THEN** items that depend on "Mussarela" appear in the queues again

### Requirement: Preparing badge in arrival position
An item with status "Preparing" SHALL remain in its arrival position in the queue, marked as "Preparing".

#### Scenario: Started item stays in place with a badge
- **WHEN** preparation of a queue item is started
- **THEN** the item stays in its arrival position and is shown marked as "Preparing"

### Requirement: Only items to prepare are shown
A queue SHALL contain only items whose status is "Pending" or "Preparing". An item confirmed "Ready" SHALL leave the queue.

#### Scenario: Finished item leaves the queue
- **WHEN** preparation of a queue item is confirmed finished
- **THEN** the item no longer appears in the queue

### Requirement: Queue items are individually addressable
Each item shown in a queue SHALL identify the order item it represents, so the panel can act on exactly that line. When an order contains several lines of the same catalog item, each line SHALL appear as its own row carrying its own order-item id, in arrival order.

#### Scenario: Two identical dishes appear as two addressable rows
- **WHEN** an order contains two lines of the same dish "Calabresa", both "Pending"
- **THEN** the queue shows two rows for "Calabresa", each carrying a distinct order-item id

#### Scenario: A queue row exposes the order item it represents
- **WHEN** a dish is pending in the kitchen queue
- **THEN** the row shows the order item it represents together with the dish name, quantity, and status

### Requirement: Panel actions on preparation
For each queue item the panel SHALL offer a "start" action while the item is "Pending" and a "finish" action while it is "Preparing". Acting on a row SHALL change exactly that order item, and SHALL be refused when the acting profile may not perform the action.

#### Scenario: Cook finishes one of two identical dishes
- **WHEN** a Cook starts and then finishes the first "Calabresa" row of an order that has two pending "Calabresa" lines
- **THEN** the acted line becomes "Ready" and leaves the queue while the second line stays "Pending" in its arrival position

#### Scenario: Waiter is refused the panel actions
- **WHEN** a Waiter profile attempts to start or finish a queue item
- **THEN** the system refuses the action with the message "Access not authorized for your profile"
