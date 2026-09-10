## 1. Closing waits for the kitchen (orders/checkout)

- [x] 1.1 Guard the close path in `CloseOrderUseCase` (reading each item's preparation status): while any order item is still `Pending` or `Preparing`, refuse with the message "Cannot close an order with items in preparation"; verify the checkout use-case spec covers the refusal with a `Pending`/`Preparing` item, success once every kitchen item reached `Ready`, and success for orders holding only non-prepared items
- [x] 1.2 Confirm (regression) the existing refusals still hold — empty order, delivery order, double close — through the use-case spec; verify `npm test` passes

## 2. Cancellations carry no reason (orders/order-item-status + kitchen route)

- [x] 2.1 Drop `reason` from the orders module's cancel-order and cancel-item DTOs and from the kitchen cancel-preparation handler (it reads the shared cancel-item DTO — no kitchen DTO file exists); verify the module specs: a cancellation without a reason succeeds and removes the item, and the "Cannot cancel an item in preparation" refusal is unchanged
- [x] 2.2 Stop persisting the reason — cancellation history records item + cancellation time only: remove `reason` from the `OrderCancellation` Prisma schema, generate and run the migration, and verify the migration applies and the affected specs pass

## 3. One atomic item update (catalog/management)

- [x] 3.1 Extend `PATCH /items/:itemId` to accept name, description, price, `requiresPreparation` and `ingredientIds` (replacing ingredient links wholesale when present), reusing the existing price validation ("Price cannot be negative"); verify controller/use-case specs cover changing everything in one request and the negative-price refusal
- [x] 3.2 Keep the category fixed at creation: the update contract ignores/strips any category in the request and the item never moves category; verify a spec asserts a category change attempt leaves the item in its original category
- [x] 3.3 Retire `PATCH /items/:itemId/price` and the `POST`/`DELETE /items/:itemId/ingredients...` endpoints (handlers, DTOs, use cases) and update every spec that calls them; verify `npm test` passes and the routes are gone from the items controller

## 4. Feature files and project docs

- [x] 4.1 Remove the motive from the cancellation scenarios across `features/03_table_order.feature`, `features/06_cook_profile.feature`, `features/09_cancellation_and_payment.feature` and `features/10_table_management.feature` and stop asserting the reason is recorded in the order history
- [x] 4.2 Update `features/02_menu_and_stock.feature` (price and ingredient-link scenarios move onto the single item update, which changes everything in one request and never the category) and `features/07_manager_profile.feature` (closing is refused while an item is "Pending"/"Preparing"; a table order closes once every kitchen item reached "Ready")
- [x] 4.3 Update the backend project docs that inventory the API (retired price and ingredient-link endpoints, cancel contracts without reason, close gate) and verify they read consistently with the controllers
