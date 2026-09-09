## Why

`/kitchen` is the last placeholder among the three panel roles, yet the backend kitchen surface is already complete and committed (`GET /kitchen/queue` + start/finish/cancel preparation verbs, Cook/Manager roles). Feature `06_cook_profile.feature` defines the panel, and the cook profile is the missing half of the order lifecycle — every dish the waiter and manager screens move around is actually produced here.

## What Changes

- **`/kitchen` becomes the Kitchen Panel** replacing the placeholder: two columns — **Entrega** and **Local** — holding flat stacks of **item tiles in arrival order**, exactly as the server returns them (orders sorted by arrival, items within an order by item arrival). Each tile shows only the item itself — name, quantity, status label, a background color indicating the status, and the item's notes when present. Drinks and non-prep items never appear (the server filters those, plus out-of-stock ingredients), and no order-level information is shown: no table number, no customer name, no order identifiers.
- **Per-tile actions by status** — a `Pending` tile offers **Iniciar preparo**; a `Preparing` tile offers **Finalizar** and **Cancelar preparo** (with a required reason, recorded in the order history by the backend). Each state maps to its own `/kitchen` verb, keeps the tile busy while in flight, and refreshes the queue. A tile that turns `Ready` or is cancelled leaves the queue on the next refresh.
- **Status colors from theme tokens** — two semantic tokens (`@theme` in `src/index.css`, current palette) paint the Pending/Preparing tiles; repainting the panel is a two-line change.
- **Liveness** — the queue auto-refreshes every 15s (`refetchInterval`) plus a manual **Atualizar** button; no push channel exists, and the features do not demand realtime.
- **No ingredient consultation for the cook** — scenario "Cook does not have access to the ingredient consultation" is satisfied by absence: kitchen tiles offer no ingredient affordance.
- **Shared order-side rules (refactor)** — the cancellation reason form schema (`cancellationReasonFormSchema` / `TCancellationReasonFormValues`) and the item status labels (`ITEM_STATUS_LABELS` / `itemStatusLabel`) move out of `pages/waiter/business/` into shared `src/lib/`, because the kitchen context now needs both and contexts never import each other. Waiter importers (`CancelItemDialog`, `CancelOrderDialog`, specs) switch to the shared modules; no behavior changes.
- **Small data contract add-on (backend)** — item notes exist end-to-end in the backend (domain, persistence, waiter payload) but `/kitchen/queue` does not expose them, so a tile cannot show "notes if any". The backend queue item gains one nullable `notes` field — a minimal backend-repo slice (its own unit spec updates) that this change's tasks list as a prerequisite. Nothing else changes in the payload: the panel shows no order-level data, so `tableId`/`customerName`/`tableNumber` stay out of scope.

## Capabilities

### New Capabilities

- `kitchen-panel`: the cook's production panel — two queues (Entrega/Local) by arrival order showing only preparation items, per-item start/finish/cancel-preparation actions, and 15s auto-refresh with a manual refresh; traces to `features/06_cook_profile.feature`.

### Modified Capabilities

None — the waiter refactor above changes implementation only, not behavior.

## Impact

- `src/lib/` — new shared modules for the cancellation reason schema and the item status labels.
- `src/index.css` — two semantic `@theme` tokens for the item status colors (addresses part of the Tailwind-token debt in 08-conventions).
- `pages/waiter/business/labels.ts`, `schemas.ts` and the dialogs that import them — slimmed down, imports redirected.
- `pages/kitchen/` — new `api/`, `hooks/`, `components/` and the real screen; route, roles and nav already exist and stay unchanged.
- Backend (sibling repo, prerequisite): `kitchen` queue item DTO gains a nullable `notes` field + its unit spec; frontend zod schema consumes it.
- No new dependencies; no routing changes.
