## 1. API and business layer

- [x] 1.1 Add `cancelOrder(orderId, reason)` (`POST /orders/:orderId/cancellation`, body `{ reason }`) and `updateOrderItemQuantity(orderId, orderItemId, quantity)` (`PATCH /orders/:orderId/items/:orderItemId/quantity`, body `{ quantity }`) to `pages/waiter/api/orders.api.ts`. Verify: `tsc` passes; payloads match the backend DTOs.
- [x] 1.2 Rename `cancelItemFormSchema` / `TCancelItemFormValues` in `pages/waiter/business/schemas.ts` to the shared `cancellationReasonFormSchema` / `TCancellationReasonFormValues`, updating `CancelItemDialog` and its spec. Verify: `npm test` green.
- [x] 1.3 Add `Cancelled: 'Cancelado'` to `ORDER_STATUS_LABELS` in `pages/waiter/business/labels.ts` and update `labels.spec.ts`. Verify: `npm test` green.

## 2. Hooks

- [x] 2.1 Create `pages/waiter/hooks/use-cancel-order.ts` — mutation over `cancelOrder`; `onSuccess` invalidates `['orders']` and `TABLES_QUERY_KEY`. Verify: `tsc` passes.
- [x] 2.2 Create `pages/waiter/hooks/use-update-item-quantity.ts` — mutation over `updateOrderItemQuantity`; `onSuccess` invalidates `['orders']`. Verify: `tsc` passes.

## 3. Components

- [x] 3.1 Create `pages/waiter/components/CancelOrderDialog/index.tsx` — modeled on `CancelItemDialog` (Card overlay, `role="dialog"`, aria-label "Cancelar pedido da mesa {n}", reason TextField via `cancellationReasonFormSchema`, backend errors via `setError('root')`, submit label "Cancelar pedido" / "Cancelando…"). Verify: colocated spec asserts validation, the confirm call with the reason, the close path and the verbatim backend error; `npm test` green.
- [x] 3.2 Create `pages/waiter/components/QuantityStepper/index.tsx` — `−`/`+` buttons around the quantity, accessible labels "Diminuir quantidade" / "Aumentar quantidade", `−` disabled at `quantity <= 1`, both disabled while `busy`. Verify: colocated spec asserts disabled states and that the buttons call the handlers with the right direction; `npm test` green.

## 4. Order detail screen wiring

- [x] 4.1 In `pages/waiter/pages/order-detail.tsx`: add the "Cancelar pedido" header action gated on `isOpen`; render `CancelOrderDialog` and, on confirmed cancel, `navigate('/waiter/tables')`. Verify: dev-server smoke test cancels an order and lands back on the floor with the table free.
- [x] 4.2 Render `QuantityStepper` on each item row of an open order, wired to `use-update-item-quantity` (per-row `busy`, target `quantity ± 1`), and add a page-level alert above the items card for refusals (`toErrorMessage`). Verify: dev-server smoke test raises/lowers a quantity (including an item the kitchen is preparing) and sees the total update.
- [x] 4.3 Render the cancelled read-only state: the "Cancelado" badge comes from the label map; the items card shows "Este pedido foi cancelado." when an order is cancelled and empty. Verify: dev-server smoke test deep-links to a cancelled order — no add/cancel/stepper actions, zero total.

## 5. Feature specs and rules sync

- [x] 5.1 Mirror the backend change's scenarios into `features/09_cancellation_and_payment.feature` (whole-order cancellation), `features/03_table_order.feature` (quantity adjustment) and `features/10_table_management.feature` (table shows free after cancellation). Verify: the three files match their backend counterparts.
- [x] 5.2 Update `.claude/rules/01-project-context.md` — waiter order-detail mapping gains cancel-order and quantity adjustment; note the cancelled read-only state. Verify: doc matches the implemented screen.

## 6. Final gate

- [x] 6.1 Run `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and smoke-check the dev server serves `/waiter/orders/:id` with the new actions. Verify: all commands pass.
