# orders/order-item-quantity Specification

## Purpose
Defines how a waiter (or manager) adjusts the quantity of an item already added to an open order — fixing a mis-typed amount, or adding more of the same item into a single line. The kitchen sees the change. An increase is refused once the kitchen has finished the item; a decrease stays available whatever the item's preparation status. Traces to `features/03_table_order.feature` (quantity adjustment scenarios).

## Requirements

### Requirement: Adjusting an item quantity
The system SHALL set the quantity of an order item to an informed value of at least one while the order is open. Decreasing SHALL be allowed whatever the item's preparation status — including "Preparing" and "Ready". Increasing SHALL be refused once the kitchen has finished the item: a target above the current quantity on an item with status "Ready" SHALL be refused with the message "Cannot change a ready item", because the further portion would never be made. Items that never enter the kitchen flow (no preparation status) and items still "Pending" or "Preparing" SHALL accept an increase. The kitchen SHALL see the updated quantity.

#### Scenario: Increasing the quantity of a drink
- **WHEN** the waiter sets the quantity of a drink in an open order from "2" to "5"
- **THEN** the item records quantity "5"

#### Scenario: Decreasing the quantity of a pizza
- **WHEN** the waiter sets the quantity of a pizza in an open order from "3" to "1"
- **THEN** the item records quantity "1"

#### Scenario: Increasing a pizza that is in preparation
- **WHEN** the waiter sets the quantity of a pizza with status "Preparing" in an open order from "1" to "2"
- **THEN** the item records quantity "2" and the kitchen sees the updated quantity

#### Scenario: Increasing an item the kitchen has finished
- **WHEN** the waiter tries to increase the quantity of a pizza with status "Ready"
- **THEN** the system refuses with the message "Cannot change a ready item"

#### Scenario: Decreasing an item the kitchen has finished
- **WHEN** the waiter sets the quantity of a pizza with status "Ready" from "2" to "1"
- **THEN** the item records quantity "1"

#### Scenario: Quantity below one
- **WHEN** the waiter tries to set the quantity of an order item to "0"
- **THEN** the system refuses the request

### Requirement: Frozen orders refuse quantity adjustments
Adjusting the quantity of an item SHALL be refused on orders that are not open. A closed order SHALL be refused with the message "Cannot change a closed order"; a cancelled order SHALL be refused with the message "Cannot change a cancelled order".

#### Scenario: Adjusting an item of a closed order
- **WHEN** the waiter tries to adjust the quantity of an item of a closed order
- **THEN** the system refuses the operation with the message "Cannot change a closed order"

#### Scenario: Adjusting an item of a cancelled order
- **WHEN** the waiter tries to adjust the quantity of an item of a cancelled order
- **THEN** the system refuses the operation with the message "Cannot change a cancelled order"
