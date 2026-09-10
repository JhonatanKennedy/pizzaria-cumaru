## 1. Domain: status, cancel verb, frozen guards

- [x] 1.1 Add `CANCELLED = 'Cancelled'` to `EOrderStatus` (`src/orders/domain/enums/order-status.ts`) and verify `npm test` — the mapper's status `Set` derives from `Object.values`, so restore of a stored `Cancelled` order parses automatically
- [x] 1.2 Add `Order.cancelOrder(reason, cancelledAt)` to `src/orders/domain/entities/orders.ts`: blank reason -> "Cancellation reason is required", `Closed` -> "Cannot change a closed order", any other non-open status -> "Only open orders can be cancelled", otherwise clear all remaining items (regardless of status), set the order status to `Cancelled` and store `cancellationReason` / `cancelledAt`; extend `TRestoreOrderParams` and the getters for the two new fields, and verify `orders.spec.ts` covers: cascade over Pending/Preparing/Ready/no-status items, an empty order cancels with the reason kept, the three refusal branches, other orders untouched (`npm test`)
- [x] 1.3 Frozen-cancelled guard sweep: `addItem`, `cancelItem` and `cancelPreparationItem` refuse on a `Cancelled` order with "Cannot change a cancelled order", and `close()` refuses with "Cannot close a cancelled order"; verify each refusal in `orders.spec.ts` alongside the existing closed-order cases (`npm test`)

## 2. Use-cases and module wiring

- [x] 2.1 Create `CancelOrderUseCase` in `src/orders/application/use-cases/cancel-order.ts` (`{ orderId, reason }`; order not found -> "Order not found"; delegates to `Order.cancelOrder` with the clock injected at the call site, then saves) and verify a unit spec covers the happy path, the not-found error and the refusal branches (`npm test`)
- [x] 2.2 Create `UpdateOrderItemQuantityUseCase` in `src/orders/application/use-cases/update-order-item-quantity.ts` (`{ orderId, orderItemId, quantity }`): order not found -> "Order not found", item not found -> "Item not found", frozen guards per design decision 3, no-op save when `target === current`, otherwise diff onto `increaseQuantity`/`decreaseQuantity` (no status restriction), then saves; verify the unit spec covers raise, lower, no-op, both not-found errors and both frozen messages (`npm test`)
- [x] 2.3 Export both use-cases from `OrdersModule` (providers + exports, next to their siblings) and verify `npm run build` passes

## 3. Endpoints

- [x] 3.1 Add `POST :orderId/cancellation` to `OrdersController` with a reason DTO (`{ reason }`, `@IsString`/`@IsNotEmpty`, reusing the `CancelItemDto` shape), decorated `@Roles({ roles: [EUserRole.WAITER, EUserRole.MANAGER] })`, and add the route to the permission matrix comment in `src/common/guards/roles.guard.ts`; verify `npm run build` passes
- [x] 3.2 Add `PATCH :orderId/items/:itemId/quantity` to `OrdersController` with an `UpdateOrderItemQuantityDto` (`{ quantity }`, `@IsInt`/`@Min(1)`), same roles and matrix comment update; verify `npm run build` passes
- [x] 3.3 Assert the flows in `test/order-status.e2e-spec.ts`: a waiter cancels an open table order that has a drink and a pizza the kitchen started — the order becomes "Cancelled", the kitchen queue drops the pizza, adding an item afterwards returns 400 with "Cannot change a cancelled order", and a new order for the same table succeeds; quantity: raising and lowering an item succeeds, raising a "Preparing" pizza succeeds (the queue shows the new quantity), a closed order refuses with "Cannot change a closed order", and a Cook attempt on either route returns 403 with "Access not authorized for your profile" (`npm run test:e2e`)

## 4. Persistence

- [x] 4.1 Add nullable `cancelledReason String?` and `cancelledAt DateTime?` to the `Order` model in `src/prisma/schema.prisma`, regenerate the client (`npx prisma generate`) and apply the change to the dev database; verify `npm run build` passes
- [x] 4.2 Extend `order-mapper.ts`: `orderRowToDomain` restores the two fields onto the aggregate, `orderDomainToCreate`/`orderDomainToUpdate` persist them; verify `prisma-orders-repository.spec.ts` covers a cancelled-order round-trip (status "Cancelled" with reason and time survives `save` + reload, items empty) (`npm test`)

## 5. Feature specs

- [x] 5.1 Add to `features/09_cancellation_and_payment.feature` the whole-order cancellation scenario: the waiter cancels the order of a table whose customer gave up, with a pizza already in preparation — every item leaves the order, the order is marked cancelled and a new order can be opened for the same table
- [x] 5.2 Add to `features/03_table_order.feature` the quantity scenarios: the waiter raises and lowers the quantity of an item (including one already in preparation), and the system refuses to adjust an item of a closed order
- [x] 5.3 Add to `features/10_table_management.feature` the floor scenario: after the waiter cancels the open order of a table, the listing shows the table with no open order again

## 6. Verification

- [x] 6.1 Run `npm test`, `npm run test:e2e`, `npm run lint`, and `npm run format` and verify all pass
