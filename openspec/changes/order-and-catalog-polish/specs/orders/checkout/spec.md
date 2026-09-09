## MODIFIED Requirements

### Requirement: Closing a local order with payment
The system SHALL close a local order when given a payment method: the order status becomes "Closed", the payment method is recorded, and the total value is calculated from the order's items. An order without items SHALL NOT close. A closed order SHALL NOT close again. A delivery order SHALL be refused from this flow. An order with a kitchen item still "Pending" or "Preparing" SHALL NOT close — the system refuses with the message "Cannot close an order with items in preparation". Items that need no preparation (drinks, for example) do not block the close.

#### Scenario: Manager closes a table order
- **WHEN** the open order of table "10" is closed informing the payment method "CreditCard" after every kitchen item of the order reached "Ready"
- **THEN** the order status becomes "Closed", the payment method "CreditCard" is recorded, and the total value is calculated

#### Scenario: Closing an empty order
- **WHEN** an order with no items is closed
- **THEN** the system refuses with the message "Order must have at least one item"

#### Scenario: Closing a delivery order
- **WHEN** a delivery order is closed with a payment method
- **THEN** the system refuses with the message "Only local orders can be closed"

#### Scenario: Closing while the kitchen still prepares an item
- **WHEN** the open order of table "10" is closed while one of its kitchen items is still "Pending" or "Preparing"
- **THEN** the system refuses with the message "Cannot close an order with items in preparation"

#### Scenario: Closing an order with only non-prepared items
- **WHEN** the open order of table "10" holds only items that need no preparation
- **THEN** the order closes with the informed payment method
