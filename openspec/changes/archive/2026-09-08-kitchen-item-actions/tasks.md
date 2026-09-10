## 1. Prerequisites

- [x] 1.1 Verify the committed sweep builds and unit tests pass (`npm run build` and `npm test` on the current master) before editing

## 2. Kitchen endpoints surface

- [x] 2.1 Export `StartItemPreparationUseCase` and `FinishItemPreparationUseCase` from `OrdersModule` and verify `npm run build` passes
- [x] 2.2 Add `POST /kitchen/orders/:orderId/items/:orderItemId/start` and `.../finish` to `KitchenQueueController`, both decorated `@Roles({ roles: [EUserRole.COOK, EUserRole.MANAGER] })`, delegating to the injected use-cases, and verify the kitchen module wiring compiles

## 3. Addressable queue rows

- [x] 3.1 Add `orderItemId` to `IKitchenQueueItem`, populated from the order item's own id in `list-kitchen-queue.ts`, and verify `list-kitchen-queue.spec.ts` covers the field and that duplicate catalog-item lines carry distinct `orderItemId`s (run `npm test`)
- [x] 3.2 Assert the addressable-row behavior in `test/order-status.e2e-spec.ts`: an order with two identical dishes shows two rows with distinct `orderItemId`s, and starting/finishing the first leaves the second "Pending"

## 4. Remove the generic route

- [x] 4.1 Remove the `PATCH /orders/:orderId/items/:itemId/status` route, its status dispatch, the `StartItemPreparationUseCase`/`FinishItemPreparationUseCase` injections from `OrdersController`, and delete `update-item-status.dto.ts`; verify no references remain (`grep -rn "UpdateItemStatusDto" src test` empty) and `npm run build` passes
- [x] 4.2 Retarget the remaining `order-status.e2e-spec.ts` call sites to the kitchen routes; replace the deleted DTO's invalid-status 400 scenario with the spec's waiter-refusal scenario (waiter attempt is refused with "Access not authorized for your profile") and verify the suite passes (`npm run test:e2e`)

## 5. Verification

- [x] 5.1 Run `npm test`, `npm run test:e2e`, `npm run lint`, and `npm run format` and verify all pass with the spec delta scenarios covered
