## Why

The Gherkin specs promise the manager can close a table order (`features/07_manager_profile.feature` — "Manager closes a table order") and that waiters cannot (`features/05_waiter_profile.feature`). The backend implements the verb (`POST /orders/:orderId/close`, Manager-only — the sibling `close-order` change), but the SPA has no surface for it: the order detail screen offers "Cancelar pedido" only, so an open order can never become "Fechada" through the UI and its table never frees for a new service.

## What Changes

- On the shared waiter order-detail screen (`/waiter/orders/:orderId`), show a "Fechar conta" action on open orders **for managers only**; waiters see no close affordance anywhere.
- The action opens a close dialog asking for the payment method (Dinheiro/Cartão/Pix — the same labels the manager day view uses); confirming sends `POST /orders/:orderId/close` with the chosen method and, on success, returns to the tables floor with the order closed and its table freed. Backend errors (e.g. the Manager-only 403) surface verbatim in the dialog.
- The manager-only decision is made in the assembly layer: contexts never import the auth context, so `routes/` renders the order detail with a `canCloseOrder` prop derived from the session role.
- Add the waiter-context API call (zod-validated response mirroring the backend result), a mutation hook that invalidates the orders and tables queries on success, and the close dialog component with a colocated spec.
- Split-bill (`splitInto`) stays out of scope: this change closes with a single payment method only.

## Capabilities

### New Capabilities
- `close-table-order`: closing an open local table order with a payment method — the manager's verb, absent for waiters, rendered on the shared order detail screen.

### Modified Capabilities
<!-- none — no main specs exist on disk; this change's delta spec is the spec of record -->

## Impact

- `src/pages/waiter/` — `business/schemas.ts` gains the close response schema; `api/orders.api.ts` gains `closeOrder(orderId, paymentType)`; a new `hooks/use-close-order.ts` mirrors `use-cancel-order`; a new `components/CloseOrderDialog/` (payment picker over `@lib/payment-labels`) renders the manager's choice; `pages/order-detail.tsx` gains the `canCloseOrder` prop, the button and the dialog wiring.
- `src/routes/` — new `order-detail-route.tsx` adapter reads the session via `useAuth` and hands the page `canCloseOrder={user?.role === 'Manager'}`; `router.tsx` mounts it under the existing `RequireRole roles={WAITER_PANEL_ROLES}` route.
- `src/lib/payment-labels.ts` — the payment union/labels are already shared (manager day view); the close dialog is the second consumer.
- Backend: consumed as-is; no changes needed.
