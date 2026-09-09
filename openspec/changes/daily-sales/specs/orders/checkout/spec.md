## ADDED Requirements

### Requirement: Day sales listing
The system SHALL list the day's sales — local orders closed that day and delivery orders delivered that day — each showing the responsible waiter's name, the sale time (the close time for local sales, the delivery time for delivery sales), the payment method when the order was closed with one, the total value, and its items with their preparation status. Open, preparing, out-for-delivery, and cancelled orders SHALL NOT appear.

#### Scenario: Completed sales are listed with their details
- **WHEN** the manager consults the day's sales, with local orders closed and delivery orders delivered that day
- **THEN** each sale shows the responsible waiter's name, the sale time, the payment method when the sale was closed with one, the total value, and its items with their preparation status

#### Scenario: Incomplete and cancelled orders stay out of the listing
- **WHEN** the day has an open local order, a delivery order out for delivery, and a cancelled local order
- **THEN** none of those orders appears in the day's sales listing
