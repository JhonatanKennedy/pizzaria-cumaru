# daily-earnings-report Specification

## Purpose
The manager's daily earnings report: the takings of the day as the grand total plus the Local and Delivery subtotals, filterable by order type. Traces to `features/07_manager_profile.feature`.

## Requirements

### Requirement: Show the day's earnings totals

The report MUST show the current day's earnings in three values, formatted in Brazilian currency: the grand total, the total of local orders (closed table orders), and the total of delivery orders (delivered). Each value MUST reflect the backend's report (`GET /reports/daily-earnings`), whose totals come from orders completed during the day.

#### Scenario: Viewing the three totals

- **WHEN** a Manager opens the Daily Earnings Report for a day with local orders closed totaling R$ 480,00 and delivery orders delivered totaling R$ 210,00
- **THEN** the report shows the local total of R$ 480,00, the delivery total of R$ 210,00 and the grand total of R$ 690,00

### Requirement: Filter the report by order type

The report MUST offer filters for the order type — Local and Delivery — and MUST show only the total of the active type while a filter is on; clearing the filter MUST restore the three totals.

#### Scenario: Filtering by Local

- **WHEN** a Manager filters the day's report by the type "Local"
- **THEN** only the total of R$ 480,00 referring to local orders is displayed

#### Scenario: Filtering by Delivery

- **WHEN** a Manager filters the day's report by the type "Delivery"
- **THEN** only the total of R$ 210,00 referring to delivery orders is displayed

#### Scenario: Clearing the filter

- **WHEN** a Manager clears an active type filter
- **THEN** the report shows the three totals again

### Requirement: Show loading and failure states

While the report loads, the screen MUST show a loading state; a failed load MUST show the backend's message verbatim with a retry path.

#### Scenario: Report load fails

- **WHEN** the backend refuses the daily-earnings report request
- **THEN** the screen shows the backend message as-is and offers a retry
