# Order Checkout Specification

## Purpose

Defines the checkout flows: closing a local order with its payment method, splitting the bill, the daily earnings report, and the day's order listing with the responsible waiter.

## Requirements

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

### Requirement: Closing frees the table
After a table's order is closed, the table SHALL be available for a new order.

#### Scenario: Table reused after closing
- **WHEN** the order of table "10" is closed
- **THEN** a new order for table "10" can be created

### Requirement: Splitting the bill
The system SHALL split an order's total into a requested number of equal parts, reporting each part's value.

#### Scenario: Splitting into three
- **WHEN** the order of table "12" with total value "R$ 120.00" is split into "3" equal parts
- **THEN** each part has the value "R$ 40.00"

### Requirement: Daily earnings report
The system SHALL report the day's earnings: the grand total, the total of closed local orders, and the total of delivered delivery orders, counting orders closed or delivered on that day.

#### Scenario: Manager consults the report
- **WHEN** 5 local orders were closed totaling "R$ 480.00" in the day and 3 delivery orders were delivered totaling "R$ 210.00" in the day
- **THEN** the report shows the grand total "R$ 690.00", the local total "R$ 480.00", and the delivery total "R$ 210.00"

### Requirement: Earnings report filter by type
The earnings report SHALL support filtering by order type, showing only that type's total.

#### Scenario: Filtering by type
- **WHEN** the report is filtered by the type "Local"
- **THEN** only the total referring to orders of type "Local" is shown

### Requirement: Order listing with the responsible waiter
The day's order listing SHALL display, for each order, the name of the waiter who registered it and the preparation status of its items.

#### Scenario: Manager sees who registered each order
- **WHEN** the manager accesses the list of the day's orders and the waiter "joao.garcom" opened two of them
- **THEN** each of those two orders displays the waiter's name, and each item displays its preparation status

### Requirement: Day sales listing
The system SHALL list the day's sales — local orders closed that day and delivery orders delivered that day — each showing the responsible waiter's name, the sale time (the close time for local sales, the delivery time for delivery sales), the payment method when the order was closed with one, the total value, and its items with their preparation status. Open, preparing, out-for-delivery, and cancelled orders SHALL NOT appear.

#### Scenario: Completed sales are listed with their details
- **WHEN** the manager consults the day's sales, with local orders closed and delivery orders delivered that day
- **THEN** each sale shows the responsible waiter's name, the sale time, the payment method when the sale was closed with one, the total value, and its items with their preparation status

#### Scenario: Incomplete and cancelled orders stay out of the listing
- **WHEN** the day has an open local order, a delivery order out for delivery, and a cancelled local order
- **THEN** none of those orders appears in the day's sales listing
