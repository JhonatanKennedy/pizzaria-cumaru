## 1. API contract

- [x] 1.1 Add `closedOrderSchema` (+ `TClosedOrder`) to `src/pages/waiter/business/schemas.ts`, mirroring the backend close result (`id`, `status`, `paymentType` enumerated from `@lib/payment-labels` `PAYMENT_TYPES`, `total`, optional `parts`). Verify: `npm run build` passes.
- [x] 1.2 Add `closeOrder(orderId, paymentType)` to `src/pages/waiter/api/orders.api.ts` — `POST /orders/:orderId/close` with the payment body, response parsed at the boundary. Verify: `npm run build` passes.

## 2. Mutation hook

- [x] 2.1 Create `src/pages/waiter/hooks/use-close-order.ts` mirroring `use-cancel-order.ts` (mutation over the new API function; on success invalidate the `['orders']` query and `TABLES_QUERY_KEY`). Verify: `npm run build` passes.

## 3. Close dialog

- [x] 3.1 Create `src/pages/waiter/components/CloseOrderDialog/`: CancelOrderDialog overlay skeleton; a required radio picker of the three payment methods (`PAYMENT_TYPES`/`paymentLabel` from `@lib/payment-labels`) rendered as pill labels; confirm disabled until a method is chosen and while the close is in flight ("Fechando…"); Voltar disabled while busy; a thrown backend error shows verbatim in a `role="alert"` block and re-enables the dialog. Verify: the colocated spec renders the dialog with the three methods, keeps confirm disabled until a choice, confirms with the chosen method, disables both actions while the promise is pending, surfaces a backend error verbatim and calls `onClose` on Voltar; `npm test` green.

## 4. Order detail page

- [x] 4.1 `src/pages/waiter/pages/order-detail.tsx` gains an optional `canCloseOrder` prop (default `false`) and, when an open order is viewed with it, renders a "Fechar conta" header button next to "Cancelar pedido" opening the dialog; confirming sends the close mutation and navigates back to `/waiter/tables` on success. Verify: `npm run build` passes; the page still compiles with the default prop for any non-adapter mount.

## 5. Role wiring in the assembly layer

- [x] 5.1 Create `src/routes/order-detail-route.tsx`: reads `useAuth()` and renders `<OrderDetailPage canCloseOrder={user?.role === 'Manager'} />`; `router.tsx` mounts it inside the existing `/waiter/orders/:orderId` `RequireRole roles={WAITER_PANEL_ROLES}` guard. Verify: `npm run build` passes; with the seeded profiles a Waiter sees no close action on an open order while a Manager does (dev-server check).

## 6. Docs and final gate

- [x] 6.1 Update `.claude/rules/01-project-context.md`: the routes table notes the manager close action on the order detail, and the 07 feature-mapping row drops "close-order flow … still pending" (split bill remains pending). Verify: the file matches `router.tsx` and the feature mapping.
- [x] 6.2 Final gate: `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and a live check against the dev backend that the screen mounts for `ana.gerente` and `joao.garcom` (read-only: no close request is sent to the dev database).
