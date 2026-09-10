## 1. Prerequisites

- [x] 1.1 Verify `http-error-handling` and `orders-creation` are applied and `npm run build` passes

## 2. Domain

- [x] 2.1 Extend `EOrderStatus` with `PREPARING = 'Preparing'`, `OUT_FOR_DELIVERY = 'Out for delivery'`, `DELIVERED = 'Delivered'` and add `deliveredAt?` to `Order` with its getter; verify `orders.spec.ts` covers the new field round-trip
- [x] 2.2 Add `startDeliveryPreparation()`, `sendOutForDelivery()`, `markDelivered(deliveredAt)` with the D2 guards and verify `orders.spec.ts` covers the full cycle, the two refusal messages, and the recorded delivery time

## 3. Persistence

- [x] 3.1 Add `deliveredAt DateTime?` to the Prisma `Order` model, run `npx prisma migrate dev` (third migration), and verify the generated client compiles
- [x] 3.2 Update the order mapper to round-trip `deliveredAt` and widen `PrismaOrdersRepository.findAllOpen` per D4 (local Open + delivery Open/Preparing/Out for delivery); verify integration tests cover an in-cycle delivery order being returned

## 4. Use-case and endpoint

- [x] 4.1 Implement `update-delivery-order-status` (load, map status to the transition method, save; unknown order refused) and wire `PATCH /orders/:orderId/status`; verify unit tests cover all three transitions, the type guard, and the invalid-transition error

## 5. E2E

- [x] 5.1 Add e2e coverage: create a delivery order (creation endpoints), mark it Preparing → Out for delivery → Delivered asserting the recorded delivery time, and verify a local order is refused with the spec message; verify `npm run test:e2e` passes

## 6. Final verification

- [x] 6.1 Run `npm run format`, `npm run lint`, `npm test`, and `npm run test:e2e` and verify all pass
