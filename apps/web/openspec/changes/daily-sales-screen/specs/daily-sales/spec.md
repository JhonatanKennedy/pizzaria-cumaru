## Purpose

The manager's day view of the day's sales: the "Vendas do Dia" section of the Daily Earnings screen shows every completed sale of the day — closed local orders and delivered delivery orders — with its waiter, payment method, sale time, total and items, filterable by type, payment method and category, plus sold quantities per category. Traces to `features/07_manager_profile.feature`.

## ADDED Requirements

### Requirement: List the day's sales

The Daily Earnings screen MUST show the day's sales from the backend (`GET /reports/daily-sales`) in a "Vendas do Dia" section: local orders closed during the day and delivery orders delivered during the day, newest sale first. Each sale MUST show the order type, the table or delivery tag, the payment method when the order was closed with one (delivery sales have none), the sale time (the close time for local sales, the delivery time for delivery sales), the responsible waiter, the total formatted in Brazilian currency, and its items inline with their catalog names and category tags. Open, preparing, out-for-delivery and cancelled orders MUST NOT appear. When the day has no sales yet, the section MUST say so while the report totals stay visible.

#### Scenario: Viewing the day's sales

- **WHEN** a Manager opens the Daily Earnings screen for a day with one closed local order of R$ 120,00 (paid by Pix, waiter "João Garçom") and one delivered delivery order of R$ 60,00 (waiter "João Garçom")
- **THEN** the "Vendas do Dia" section lists both sales newest first, each showing its type, sale time, waiter, formatted total and items with names and categories, and the local sale shows "Pix" while the delivery sale shows no payment method

#### Scenario: Incomplete and cancelled orders stay out

- **WHEN** the day also has an open order, an out-for-delivery order and a cancelled order
- **THEN** none of them appears in the listing

#### Scenario: A day without sales

- **WHEN** a Manager opens the Daily Earnings screen on a day with no completed sales
- **THEN** the report totals are still shown and the "Vendas do Dia" section says no sale was made

### Requirement: Filter the sales

The screen MUST filter the listed sales by order type (Local/Entrega), by payment method (Dinheiro/Cartão/Pix) and by category (Pizzas, Pratos, Bebidas, Sobremesas, Acompanhamentos). Filters MUST combine, each filter MUST have an explicit "all" option that clears it, and filtering MUST work over the day's data already fetched. The order-type filter MUST also re-query the earnings totals for that type (as the report's existing type selector does), so totals and list narrow together; the payment-method and category filters MUST narrow the sales list only and leave the totals unchanged.

#### Scenario: Filtering by order type

- **WHEN** a Manager filters the day's sales by the type "Entrega"
- **THEN** only delivered delivery sales are listed and only the delivery total is displayed

#### Scenario: Filtering by payment method

- **WHEN** a Manager filters the day's sales by the payment method "Pix"
- **THEN** only sales whose local order was closed by Pix are listed, and the report totals stay at their current order-type scope

#### Scenario: Filtering by category

- **WHEN** a Manager filters the day's sales by the category "Bebidas"
- **THEN** only sales that include at least one drink are listed, and the report totals stay at their current order-type scope

#### Scenario: Combining and clearing filters

- **WHEN** a Manager filters by the type "Local" and the category "Pizzas", then clears the category filter
- **THEN** only local sales that include a pizza are listed while both filters are on, and all local sales are listed again once the category filter is cleared

### Requirement: Show sold quantities per category

The screen MUST show, for each catalog category, how many units of that category were sold across the currently listed sales, and the summary MUST update as the filters change.

#### Scenario: Quantities follow the filtered sales

- **WHEN** a Manager filters the day's sales by the category "Bebidas"
- **THEN** the category summary shows only the drink units sold across the filtered sales

### Requirement: Show loading and failure states

While the sales or the report load, the screen MUST show a loading state; a failed load MUST show the backend's message verbatim with a retry path.

#### Scenario: Sales load fails

- **WHEN** the backend refuses the day-sales request
- **THEN** the screen shows the backend message as-is and offers a retry

#### Scenario: Report load fails

- **WHEN** the backend refuses the earnings request
- **THEN** the screen shows the backend message as-is and offers a retry
