## ADDED Requirements

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
