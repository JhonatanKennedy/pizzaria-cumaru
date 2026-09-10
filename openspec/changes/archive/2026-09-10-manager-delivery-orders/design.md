# Design — Manager delivery orders

## Context

`features/04_delivery_order.feature` describes the delivery flow; a recorded product decision makes it manager-only in the SPA (the Gherkin still casts it in the waiter's hands — the routes docs carry the reconciliation note). The backend already models delivery orders: create with `type: 'Delivery'` plus customer fields (name/phone/address), the standard add-items endpoint, `PATCH /orders/:orderId/status` with a per-type transition map (the exact refusal `'Invalid delivery status transition'`), and `deliveredAt` stamped when the order reaches `Delivered`. The listing gap — `GET /orders` not exposing the customer fields and `deliveredAt` — was closed by the sibling change. The waiter context already had everything the delivery detail needs (order listing contract, order labels, the menu enrich helper, an add-items panel) but locked inside `pages/waiter`; the manager is the second consumer, so those contracts moved to the shared folders.

## Goals / Non-Goals

- Goal: register, fill and advance a delivery order to `Delivered` on manager-only screens, with the shared waiter contracts hoisted rather than duplicated.
- Non-goals: cancelling a delivery order through the UI (the waiter cancel flow stays local-table; a cancelled delivery still renders read-only via the shared status label); closing delivery orders with a payment (delivery ends at `Delivered`, no "Fechar conta"); a waiter delivery surface (product decision); split bill; previous-day order lookup (only today's orders load — see decision 6).

## Decisions

### 1. Order contracts move to the shared folders before the manager screens exist

The delivery screens are the second consumer of the waiter order listing, its labels and its menu-enrich helper — and of the waiter add-item payload shape. Per the second-consumer-hoists convention they moved: the listing contract + `listOrders` + `ORDERS_QUERY_KEY` to `src/api/orders.api.ts` (the `@api/tables.api.ts` sibling pattern), `orderStatusLabel` to `src/lib/order-labels.ts`, `enrichOrder` to `src/lib/order-enrich.ts`, and `formatTime` (already used by the manager sales card, now also by the delivery detail) to `src/lib/format.ts`. The waiter context switched to the shared modules and deleted its local copies; its `api/orders.api.ts` kept only its mutations. Each hoist stage ran the full gate before the next step began.

- *Why:* context isolation forbids `pages/manager` importing from `pages/waiter`; shared code is shared code, and duplicated labels would drift.

### 2. The new delivery fields are `.optional()`, not `.nullable()`

Express drops `undefined` JSON keys: a local order's JSON simply lacks `customerName`, so the listing schema declares them `z.string().optional()`. `waiterName` stays `.nullable()` because the backend emits it as an explicit `null` for orders without a waiter. Mixing the two is deliberate and asserted by the shared contract spec.

### 3. No client-side required rules on the create form

The Gherkin asserts the backend's exact rejections (`'Customer name is required for delivery'`, `'Delivery address is required for delivery'`). A local required rule would shadow them with a Portuguese paraphrase; instead `createDeliveryOrderFormSchema` accepts anything and the dialog surfaces the `ApiError` message verbatim in the form's `role="alert"` slot, ready to retry. Phone stays free-form (WhatsApp numbers arrive in any shape). The dialog trims all three fields before sending.

### 4. One advance action per screen, always named after the next step

`nextDeliveryStatus(status)` maps each status to its single successor (`Open → Preparing → Out for delivery → Delivered`) and returns `null` once the order cannot advance (Delivered/Closed/Cancelled/unknown). The detail renders exactly one button labeled by `DELIVERY_ACTION_LABELS[next]` — "Iniciar preparo", "Saiu para entrega", "Marcar como entregue" — disabled with an "Atualizando…" label while the PATCH is in flight; a refusal shows the backend message verbatim above the button. No button renders at all when `next` is `null`. The next status is derived from the fresh listing data (15s polling + window-focus refetch), so a successful advance re-labels the button after the invalidate-triggered refetch.

- *Why:* the status vocabulary in the Gherkin is one-step-at-a-time; a multi-status control would invite transitions the backend refuses.

### 5. `AddItemsPanel` is a manager-local rebuild of the waiter panel

The add-items UI is the same shape both contexts need (category pills, item tiles gated by `available` with an "Indisponível" marker, quantity, flavors for pizzas, notes). Context isolation says duplication beats leakage: the manager panel lives in `pages/manager/pages/delivery/parts/AddItemsPanel/` over the manager's own add-item schema and mutation hook (which targets the same backend endpoint). It renders only while the order is `Open`; once `Preparing` the order is frozen, mirroring the waiter detail.

### 6. The list and detail read today's orders from the shared query

`GET /orders` returns today's orders only, so the delivery list filters `type === 'Delivery'` client-side (a deliberate, cheap filter over the day's set — the shared hook is also what the waiter floor uses, and one `['orders']` cache serves both). The detail finds its order in that same cache — `Pedido não encontrado.` when it is absent (a previous-day order, or a stale deep link). After a create the mutation invalidates `['orders']`, the refetch lands the new order, and the navigation to its detail arrives when the cache has it.

### 7. Delivery statuses and labels are manager-context business

The cycle map and action labels live in `pages/manager/business/delivery-status.ts` — the *order* status label stays shared (`orderStatusLabel`), but the delivery *advance* policy is a manager-context concern (waiter screens have no such cycle), so it does not hoist.

### 8. Item lines are read-only and enriched from the menu

The detail shows each line's quantity, name (from the menu catalog, `"Removido do cardápio"` for vanished items), status chip and per-line price — the waiter read-only rendering. There is no quantity stepper and no per-item cancel on delivery orders: the item set is fixed once the order leaves `Open`, matching what the backend accepts.

## Risks / Trade-offs

- [Today-only cache hides previous-day orders] → Accepted per decision 6; the not-found screen is explicit. A day-scoped orders query would need a backend date parameter that does not exist.
- [Delivery list and waiter floor share one cache and one refetch] → Both poll at 15s via the same query; acceptable for an intranet point-of-sale, and consistent with the kitchen panel.
- [A cancelled/closed delivery renders with no actions] → Correct read-only state; the status chip carries the label and the advance button disappears (decision 4).
- [Manager `AddItemsPanel` duplicates waiter code] → Accepted; the shared parts (category order, labels, item tile gating) come from `@lib/catalog` and the shared contract, so what duplicates is the thin form shell only.

## Migration Plan

Additive on both repos: backend listing fields first (its own gate), then the frontend hoists (gates green at each stage), then the manager screens and the new route. Rollback: revert the screens and router addition; the hoists are behavior-neutral refactors protected by the existing waiter specs.

## Open Questions

None that change specs or tasks. (The Gherkin's waiter-cast delivery flow vs. the manager-only product decision remains an open reconciliation, tracked in `.claude/rules/01-project-context.md`.)
