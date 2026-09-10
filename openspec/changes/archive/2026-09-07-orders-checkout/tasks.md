## 1. Prerequisites

- [x] 1.1 Verify `http-error-handling`, `orders-creation`, and `delivery-order-status` are applied and `npm run build` passes

## 2. Domain

- [x] 2.1 Replace `Order.close()` with `close(paymentType, closedAt)`, make `paymentType` mutable, add `closedAt` with its getter, and verify `orders.spec.ts` covers payment recording, the timestamp, empty-order refusal, and double-close refusal

## 3. Persistence

- [x] 3.1 Add `closedAt DateTime?` to the Prisma `Order` model, run `npx prisma migrate dev` (fourth migration), and verify the generated client compiles
- [x] 3.2 Update the order mapper to round-trip `closedAt` and the mutable `paymentType`; verify integration tests cover a closed order round-trip
- [x] 3.3 Add `findCompleted(day)` to `IOrdersRepository`/`PrismaOrdersRepository` (closedAt or deliveredAt within the day) and verify an integration test covers day membership
- [x] 3.4 Add `findAllForListing()` (orders + waiter name joined from `User`) and verify an integration test covers the join and the null waiter case

## 4. Use-cases and endpoints

- [x] 4.1 Implement `close-order` (local-only guard "Only local orders can be closed", close with payment, optional `splitInto` parts in the response) and wire `POST /orders/:orderId/close`; verify unit tests cover payment, split parts, delivery refusal, and empty-order refusal
- [x] 4.2 Implement `get-daily-earnings-report` (day totals grouped by type, optional `?type=` filter) and wire `GET /reports/daily-earnings`; verify unit tests cover the three totals and the filter
- [x] 4.3 Implement `list-orders` (listing with waiter name and item statuses) and wire `GET /orders` replacing the stub; verify unit tests cover the response shape

## 5. E2E

- [x] 5.1 Add e2e for the money journey: create a local order with items → close with payment and splitInto 2 (assert total and parts) → the earnings report reflects it → `GET /orders` shows the waiter name; verify `npm run test:e2e` passes

## 6. Final verification

- [x] 6.1 Run `npm run format`, `npm run lint`, `npm test`, and `npm run test:e2e` and verify all pass
