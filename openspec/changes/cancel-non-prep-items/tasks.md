## 1. Business rule

- [x] 1.1 Add `canCancelOrderItem(status: string | null): boolean` (true when the status is `null` or `'Pending'`) to `pages/waiter/business/` and verify its unit spec covers null, Pending, Preparing, Ready
- [x] 1.2 Run `npm test` and `npm run lint` and verify the new spec passes with zero warnings

## 2. Screen wiring

- [x] 2.1 Swap the cancel-button condition in `pages/waiter/pages/order-detail.tsx` to call the rule and verify the `CancelItemDialog` flow still opens for null-status items
- [x] 2.2 Extend the order-detail component spec with an item carrying a `null` status and verify the "Cancelar" action renders and cancels it with a reason

## 3. Verification

- [x] 3.1 Run the full `npm test` suite and verify no regression in the waiter order-detail specs
