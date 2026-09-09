# Design — complete waiter order flow

## Context

The waiter's order detail (`pages/waiter/pages/order-detail.tsx`) is a single-file screen that already owns: order header (table number, waiter, total, status badge), the items list with per-item cancel buttons gated on `isOpen && Pending`, `AddItemPanel` gated on `isOpen`, and `CancelItemDialog` (RHF + zod reason form, `aria-modal` dialog, backend errors surfaced via `setError('root')`). All mutations live in colocated hooks invalidating `['orders']`; the floor (`/waiter/tables`) renders `TABLES_QUERY_KEY` data and refetches on window focus. Order data comes from the day's `/orders` listing — statuses arrive as strings, items carry `quantity` but no unit price (unit price comes from the menu via `enrichOrder`). The backend companion change ships `POST /orders/:orderId/cancellation` (reason body; cascades over every item, sets the order to "Cancelled", frees the table) and `PATCH /orders/:orderId/items/:orderItemId/quantity` (absolute target, min 1, no preparation-status restriction).

Decided with the user: cancel-order requires a reason (mirrors item cancellation); quantity adjustment stays available while an item is in preparation; after a successful cancellation the waiter returns to the floor.

## Goals / Non-Goals

**Goals**
- Close the two gaps on the existing detail screen with the same patterns the screen already uses: dialog + reason form for cancellation, small inline stepper for quantity.
- Make cancelled orders inert and legible — a deep link to a cancelled order must not offer dead actions.
- Surface backend refusals verbatim (closed/cancelled races), per the project's error conventions.

**Non-Goals**
- No optimistic updates or websockets: mutations invalidate the queries; window-focus refetch covers cross-device freshness (kitchen updates land that way today).
- No history display — nothing renders cancellations today and the listing does not expose them.
- No changes to the floor screen or to routes/roles (detail is already `Waiter, Manager`).
- Delivery orders stay out of this flow (manager-only).

## Decisions

### 1. Cancel action and dialog
The header (next to the status badge) gains "Cancelar pedido" while the order is open, matching the action placement of the existing row-level cancels. The dialog is a sibling of `CancelItemDialog` with the same structure (Card overlay, `role="dialog"`, reason TextField, Voltar / submit buttons) and its own aria-label per table: "Cancelar pedido da mesa 5". On success the page navigates to `/waiter/tables` — a cancelled order has nothing left to do, and the floor is where the freed table becomes visible. The reason schema is shared with item cancellation; see decision 3.

### 2. Quantity stepper on the row
Each item row of an open order renders `QuantityStepper` between the name and the price: `−` `1` `+` (the row keeps its status chip). The stepper is a dumb component — props `quantity`, `busy`, `onDecrease`, `onIncrease` — with pt-BR accessible labels ("Diminuir quantidade" / "Aumentar quantidade"); `−` is disabled at `quantity <= 1`, both buttons while `busy` (the row's mutation in flight, preventing double-fire). `+`/`−` issue the absolute target (`quantity ± 1`); the use-case no-ops when unchanged, so no client-side guard beyond the disabled `−` is needed. Available regardless of item status — the kitchen reads current state (product decision). No stepper on rows of closed, cancelled or delivered orders (no actions there at all).

### 3. Shared reason schema, renamed once
`cancelItemFormSchema` is exactly what order cancellation needs (trimmed, `min(1)`, "Motivo é obrigatório"). Rather than `CancelOrderDialog` importing an item-named schema, rename the shared shape to `cancellationReasonFormSchema` / `TCancellationReasonFormValues` and update `CancelItemDialog`'s import — one mechanical touch, honest naming for two callers.

### 4. Mutations and error surfaces
`use-cancel-order` and `use-update-item-quantity` follow the house hook shape (mutationFn over a new `orders.api.ts` function; `onSuccess` invalidates). Cancel also invalidates `TABLES_QUERY_KEY` so a waiter who goes back sees the freed table immediately without waiting for focus-refetch. Cancel errors render inside the dialog (`setError('root')`, `CancelItemDialog` pattern); quantity errors render in a page-level alert above the items card (`toErrorMessage`, `tables.tsx` pattern) and the row keeps its current quantity. Button labels: "Cancelando…"/"Cancelar pedido" during submit.

### 5. Read-only cancelled rendering
"Cancelled" joins `ORDER_STATUS_LABELS` as "Cancelado" (fallback for unknown strings already returns the raw status). Because the backend removes every item on cancellation, a cancelled order arrives with zero items and a zero total; the items card shows an empty notice ("Este pedido foi cancelado.") instead of the bare "no items" case, and the open-order gates (`isOpen`) already suppress AddItemPanel, cancel buttons and the new stepper — the only wiring needed is the notice plus the label. No client schema changes: statuses arrive as strings and `orderListingSchema` keeps accepting them.

### 6. Backend messages stay verbatim
Refusals ("Cannot change a closed order", "Cannot change a cancelled order", the validation refusals) surface as-is through `ApiError.message` — no translation, per convention (the specs assert these strings server-side).

## Risks / Trade-offs

- [Cancelling the wrong table's order] -> Confirmation dialog shows the table number; a reason is required; worst case the manager re-opens a new order for the table (history keeps the reason).
- [Stepper and cancel race with a concurrent close] -> The backend guards both verbs; the verbatim message + query invalidation leave the UI consistent with the server state on the next read.
- [Shared schema rename touches the item-cancel spec] -> Mechanical import swap; covered by the existing `CancelItemDialog` spec, which stays green.

## Migration Plan

None — additive UI on top of the backend change; feature-flag-free, deployable independently (the buttons surface 404/ApiError until the backend routes land, which the verbatim-message pattern absorbs). Rollback: revert the components/hooks/API additions.

## Open Questions

None — flow, gates, copy direction and error surfaces were decided with the user during exploration.
