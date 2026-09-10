## 1. Prerequisites

- [x] 1.1 Verify `http-error-handling` is applied (global filter + ValidationPipe wired; DTOs decorated) and `npm run build` passes

## 2. Domain

- [x] 2.1 Add `customerName`, `phone?`, `address?` to `Order` with factory validation for delivery orders, make `paymentType` optional, and add the corresponding getters; verify `orders.spec.ts` covers delivery validation and optional payment
- [x] 2.2 Add `flavors` (default `[]`) and `notes?` to `OrderItems` with create/restore params and getters; verify `order-items.spec.ts` covers defaults and round-trip fields

## 3. Persistence

- [x] 3.1 Add `customerName`, `phone`, `address` to the Prisma `Order` model (nullable), make `paymentType` nullable, add `flavors String[]` and `notes String?` to `OrderItem`, run `npx prisma migrate dev` (second migration), and verify the generated client compiles
- [x] 3.2 Update the order mapper to round-trip the new fields and verify the repository integration tests cover them
- [x] 3.3 Add `findItemById` to `ICatalogRepository` and `PrismaCatalogRepository` and verify an integration test covers the lookup

## 4. Use-cases and endpoints

- [x] 4.1 Implement `create-order` (local: tableId required, at-most-one-open-order check via `findOpenByTableId`, refusal "Table already has an open order"; delivery: address required, refusal "Delivery address is required for delivery") and wire `POST /orders`; verify unit tests with a fake repository cover both flows and both refusals
- [x] 4.2 Implement `add-item-to-order` (catalog price snapshot, split-pizza price = highest flavor, availability refusal "Item is unavailable", notes and flavors recorded, closed-order refusal) and wire `POST /orders/:orderId/items`; verify unit tests cover price snapshot, highest-flavor pricing, availability refusal, and closed-order refusal
- [x] 4.3 Add `findOpenByTableId` to `IOrdersRepository` and `PrismaOrdersRepository` and verify an integration test covers it

## 5. E2E journeys

- [x] 5.1 Add e2e specs for the full creation journeys: create local order → add split pizza (assert unit price equals the highest flavor price) → `GET /kitchen/queue` shows the pizza; create delivery order without address → 400 with the spec message; second order for the same table → 400; verify `npm run test:e2e` passes

## 6. Final verification

- [x] 6.1 Run `npm run format`, `npm run lint`, `npm test`, and `npm run test:e2e` and verify all pass
