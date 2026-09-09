# Design — Manager closes a table order

## Context

See proposal.md — Why. The backend exposes `POST /orders/:orderId/close` with body `{ paymentType: 'Cash' | 'CreditCard' | 'Pix', splitInto?: number }` — `@Roles` Manager-only (message `'Only the manager can close the order'`), local orders only (`'Only local orders can be closed'`). It returns `{ id, status, paymentType, total, parts? }`. The waiter order detail (`pages/waiter/pages/order-detail.tsx`) already renders open orders with a "Cancelar pedido" dialog; closed/cancelled orders render read-only there, and the tables floor (`useTables` / `TABLES_QUERY_KEY`) frees a table when its order closes. Payment labels (`Cash → Dinheiro`, `CreditCard → Cartão`, `Pix → Pix`) are already shared from `lib/payment-labels.ts` (the manager day view is the first consumer).

## Goals / Non-Goals

- Goal: a manager-only "Fechar conta" path on the shared order detail — payment dialog → close → order shows Closed, table freed.
- Non-goals: split bill (`splitInto` stays out — product decision, single payment method only); closing delivery orders (they have their own status cycle); waiters closing anything (the backend refuses them); a close flow on the tables floor itself.

## Decisions

### 1. The close affordance lives on the shared order detail page

The route `/waiter/orders/:orderId` (roles `WAITER_PANEL_ROLES`) already hosts the full order view — status header with actions, items with per-item status, totals. The "Fechar conta" button joins the header actions next to "Cancelar pedido" **only when the page is rendered with `canCloseOrder` and the order is open**. On success the page navigates back to `/waiter/tables` (same as the cancel flow), where the mutation's cache invalidation already freed the table.

- *Why:* closing is the natural terminal action of the order view the manager already reaches; the feature scenario names table "10" closing from the order context. Placing it on the floor view would duplicate order state we already have here.
- Closed orders keep rendering read-only on this page (existing behavior) — a manager reopening a closed order sees "Fechada" and the total.

### 2. The manager-only decision is made in `routes/`, not in the waiter context

Contexts never import the auth context, and the order detail is waiter-owned. A new `routes/order-detail-route.tsx` adapter (assembly layer — `routes/` may read the session, as `AppLayout` already does) calls `useAuth()` and renders `<OrderDetailPage canCloseOrder={user?.role === 'Manager'} />`. `router.tsx` mounts the adapter inside the existing `RequireRole`. The page prop defaults to `false`, so any other mount renders waiter semantics.

- *Why:* keeps `pages/waiter` auth-free while surfacing a role-dependent control on a shared screen.

### 3. Dialog over RHF-free radio chips, errors verbatim

`components/CloseOrderDialog/` follows the `CancelOrderDialog` overlay skeleton (fixed overlay, `Card`, `role="dialog" aria-modal`, Voltar + confirm, busy label while submitting) but replaces the reason textarea with a required radio picker of the three payment methods rendered as pill labels (`@lib/payment-labels` `PAYMENT_TYPES`/`paymentLabel`). The confirm button stays disabled until a method is chosen; while the close is in flight both actions disable ("Fechando…"); a thrown backend error is caught and shown verbatim in a `role="alert"` block with the dialog re-enabled for a retry. No `react-hook-form` — a single required choice is plain state, not a form.

### 4. Mutation mirrors the cancel hooks and invalidates floor + orders

`hooks/use-close-order.ts` mirrors `use-cancel-order.ts`: one `useMutation` calling `closeOrder(orderId, paymentType)`; `onSuccess` invalidates `['orders']` and `TABLES_QUERY_KEY`, so the floor listing and any mounted order view refetch — the closed order's table frees and the order list shows the new status. `api/orders.api.ts` gains `closeOrder` with the response parsed through `closedOrderSchema` (new in `waiter/business/schemas.ts`, mirroring the backend result shape, `paymentType` enumerated from the shared `PAYMENT_TYPES`).

## Risks / Trade-offs

- [Waiter with a forged request could call the endpoint] → The backend's Manager-only guard refuses it with the verbatim message; the UI affordance is a surface decision only.
- [Split bill stays unimplemented while `parts` exists in the response] → The response schema keeps `parts` optional; a later change can add the split UI without touching the close contract.
- [Route adapter adds a hook read per navigation] → Negligible; `useAuth` context read, same as `AppLayout` on every route.

## Migration Plan

Additive: new schema/API function/hook/dialog + adapter; the page gains an optional prop (default `false` — waiter mounts unchanged until `router.tsx` switches to the adapter). Rollback: revert the adapter swap and the page additions.

## Open Questions

None that change specs or tasks. (Split bill and the manager's own delivery close flow remain outside this change.)
