## 1. Domain transition

- [x] 1.1 Add `cancelPreparation(reason)` to `OrderItems` (blank reason refused; status must be `PREPARING`, otherwise throws e.g. `Cannot cancel an item not in preparation`) and verify the new unit cases in `order-items.spec.ts` pass: cancelling a Preparing item succeeds, cancelling a Pending or Ready item throws, cancelling without a reason throws (`npm test`)
- [x] 1.2 Add `Order.cancelPreparationItem(itemId, reason, cancelledAt)` sharing the removal + history-recording path with `cancelItem` (extract a private helper), closed-order guard intact, and verify `orders.spec.ts` covers: the item leaves the order, the cancellation lands in history with the reason, other items and the order status are untouched, and a closed order is refused (`npm test`)

## 2. Use-case and module wiring

- [x] 2.1 Create `CancelItemPreparationUseCase` in `src/orders/application/use-cases/cancel-item-preparation.ts` (`{ orderId, itemId, reason }`; order not found -> `Order not found`, item not found by order-item id -> `Item not found`; delegates to `Order.cancelPreparationItem` with the injected clock, then saves) and verify a unit spec covers the happy path and both not-found errors (`npm test`)
- [x] 2.2 Export the new use-case from `OrdersModule` (provider + exports, next to start/finish) and verify `npm run build` passes

## 3. Kitchen endpoint

- [x] 3.1 Add `POST orders/:orderId/items/:orderItemId/cancel` to `KitchenQueueController`, decorated `@Roles({ roles: [EUserRole.COOK, EUserRole.MANAGER] })`, body `{ reason }` validated like the existing `CancelItemDto`, delegating to the injected use-case, and update the permission matrix comment in `roles.guard.ts`; verify `npm run build` passes
- [x] 3.2 Assert the behavior in `test/order-status.e2e-spec.ts`: a Cook starts two identical dishes, cancels the first via the kitchen route with a reason, and the second stays "Preparing" in the queue while the order history records one cancellation; a Waiter attempt on the route returns 403 with "Access not authorized for your profile"; the order-side cancellation of a Preparing item still returns 400 with "Cannot cancel an item in preparation" (`npm run test:e2e`)

## 4. Feature spec

- [x] 4.1 Add the cook-cancels-a-started-dish scenario to `features/06_cook_profile.feature` describing the observable outcome (dish leaves the queue with status change and recorded reason, order stays open)

## 5. Verification

- [x] 5.1 Run `npm test`, `npm run test:e2e`, `npm run lint`, and `npm run format` and verify all pass
