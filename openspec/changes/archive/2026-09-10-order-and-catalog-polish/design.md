## Context

See proposal.md — Why. Current state shaping the approach:

- `CloseOrderUseCase` (`src/orders/application/use-cases/close-order.ts`) closes a local order given a payment method; it guards "manager only" (enforced at the controller), at least one item, no double close and no delivery orders — but never looks at item preparation statuses. The SPA disables the close action preemptively (see sibling change), so the refusal here is the authoritative backstop for stale state.
- Three cancellation endpoints accept a `reason` today: `POST /orders/:orderId/cancellation` (`CancelOrderDto`), `POST /orders/:orderId/items/:itemId/cancellation` (`CancelItemDto`) and the kitchen's `POST /kitchen/orders/:orderId/items/:orderItemId/cancel`, which reads the orders presentation layer's `CancelItemDto` — there is no kitchen-specific DTO file. `OrderCancellation` persists the reason in its own column.
- The catalog update surface is split: `PATCH /items/:itemId/price` for the price, `POST /items/:itemId/ingredients` + `DELETE /items/:itemId/ingredients/:ingredientId` for ingredient links, and an update that carries name/description/flags — three round-trips and partial-save states from the SPA's three dialogs. `GET /items` already returns `ingredientIds` on every item.

## Goals / Non-Goals

**Goals:**
- Refuse closing a local order while any of its kitchen items is `Pending` or `Preparing`, with a verbatim refusal the SPA can surface.
- Drop the reason from every cancellation contract — order, item and kitchen-cancel-preparation — and from storage.
- Collapse the item update surface into one atomic `PATCH /items/:itemId` that accepts name, description, price, preparation flag and a wholesale `ingredientIds` replacement; retire the price-only and per-ingredient-link endpoints. The category stays immutable after creation.

**Non-Goals:**
- Any SPA behavior — the screens, disabled states, dialog and form changes for these contracts live in the sibling frontend change (`order-and-menu-polish`) and consume this API.
- Changing how the kitchen queue is produced or how items move `Pending → Preparing → Ready`.
- Delivery-order or split-bill flows.

## Decisions

### D1 — Close gate enforced in the close use case, not the controller

`CloseOrderUseCase` gains the check: if any order item is still `Pending` or `Preparing`, refuse with `Cannot close an order with items in preparation`. Items that never enter the kitchen (no preparation status) and items already `Ready` never block. The check lives in the use case — not the controller — so every caller (current and future) gets the same rule.

**Why refuse instead of auto-skip:** silently closing while the kitchen still works on an item would charge the customer for something not yet delivered. The SPA disables the button from the same predicate, but its data can be stale the instant a waiter adds a kitchen item; the backend refusal (surfaced verbatim by the existing dialog error path) is what actually guarantees the invariant.

### D2 — Reasons disappear from contracts and storage

`CancelOrderDto` and `CancelItemDto` drop `reason`; the kitchen cancel endpoint keeps reading the shared `CancelItemDto` (no new DTO file), so the kitchen route loses the reason too. Persisted cancellation history keeps recording item + cancellation time only; the `reason` column of the cancellations table is dropped by migration.

**Why drop the column instead of leaving it nullable:** the product decision is that no cancellation carries a reason anymore (see sibling change); a dead nullable column invites callers to repopulate it. The audit trail's purpose — which item was cancelled when — is unaffected.

### D3 — One atomic item update; category immutable at the contract

`PATCH /items/:itemId` becomes the single update verb, accepting any subset of name, description, price, `requiresPreparation` and `ingredientIds` (replacing links wholesale when present). `PATCH /items/:itemId/price` and the two ingredient-link endpoints are retired. Price validation rules reuse the existing `Price cannot be negative` refusal. The update contract does not accept `category` — the item keeps the category it was created with.

**Why wholesale replace over per-link deltas:** the SPA edit form is a checkbox list of the catalog's ingredients (see sibling change) — a full `ingredientIds` array is exactly what the form already holds, needs no diffing on either side, and makes the update atomic with the rest of the item. Per-link endpoints made sense for partial operations that no longer exist.

**Why lock the category:** the SPA edit dialog disables the category field (create-only), and the backend contract mirrors that so no caller can move an item between menu sections by accident.

## Risks / Trade-offs

- [Removing `reason` from `CancelItemDto` also affects the kitchen cancel route] → intended and covered: that route reuses the same DTO, and its main-spec gap (never asserted with a reason) means only the contract-level change applies there.
- [Wholesale `ingredientIds` on the PATCH can clobber a concurrent change of links] → accepted: single-operator intranet tool, and the SPA saves the whole item in one dialog, which removes today's three-round-trip partial states.
- [Clients still on the old endpoints break when they are retired] → the SPA's sibling change ships in tandem and is the only consumer; the old endpoints are removed, not deprecated, per the catalog spec.
- [OrderCancellation rows already persisted with a reason lose that data] → the migration drops the column deliberately; reasons were free-text operator notes with no reporting consumer.

## Migration Plan

- One migration drops the `reason` column from the cancellations table (Prisma migration generated from the schema change).
- Retired endpoints (`PATCH /items/:itemId/price`, `POST/DELETE /items/:itemId/ingredients...`) are removed in this change; deploy the API and the SPA together — the SPA's sibling change only sends reason-less cancellations and the atomic item update.

## Open Questions

- Whether the persisted cancellation history (item + time only) ever needs the reason back for reporting — if it does, the column returns with a real consumer, but per the product decision no current flow records one.
