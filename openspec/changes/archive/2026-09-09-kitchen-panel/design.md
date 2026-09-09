## Context

See proposal.md for motivation. The backend kitchen surface is complete: `GET /kitchen/queue` returns `{ delivery, local }` of open orders whose items are `Pending`/`Preparing`, require preparation and have all ingredients in stock — the filtering scenarios of `06_cook_profile.feature` are backend-owned and tested there. The frontend `/kitchen` route, `Cook`/`Manager` roles and nav already exist; only the page is a placeholder. The waiter and manager contexts (see `complete-waiter-order-flow`, `manager-menu-stock`) set the patterns this design reuses: context folders under `pages/`, zod-validated api modules at the seam, TanStack Query hooks invalidating shared query keys, dialogs as Card overlays, `toErrorMessage` + verbatim backend messages, pt-BR labels.

Product decisions that shape this design, taken with the owner: the panel shows **only items** — no order-level information of any kind (no table number, no customer name) — and each queue is a flat stack of colored item tiles; the tile colors come from the current palette and must be trivially swappable.

## Goals / Non-Goals

**Goals:**

- Kitchen Panel faithful to `06_cook_profile.feature`, restricted to item-level presentation.
- Queue freshness with 15s polling plus a manual refresh, per product decision.
- Item-order rules shared between waiter and kitchen through one source of truth.

**Non-Goals:**

- No order-level presentation: table numbers, customer names and order grouping are never rendered.
- No realtime push (none exists server-side; polling is the agreed mechanism).
- No navigation or order-detail actions from the kitchen (cooks have no order routes).
- No ingredient consultation or management from kitchen tiles (spec: absent by design).
- No cancellation of `Pending` items by the cook — that stays with the waiter's verb; the kitchen cancel acts on `Preparing` tiles only.
- No quantity adjustment from the kitchen.

## Decisions

### 1. Item tiles only, rendered in server arrival order

Each column is a flat stack of tiles; the panel renders the payload as delivered — orders sorted by arrival, items within an order by item arrival, no client-side re-sort. A tile is one queue item: name, quantity, status label, status color, and a notes line when the item has notes. Order and item ids travel on the tile only to feed the verbs; nothing order-level is displayed.

Alternatives considered: order cards with identifying headers ("Mesa N", customer name) — rejected by the "nothing more than the items" decision; client-side flattening by global item time — rejected, the server's per-order arrival semantics are the source of truth.

### 2. Status colors as theme tokens

Tailwind v4 has no config file and the app's palette is currently bare utilities scattered in components (known debt, 08-conventions §6). This change introduces the first `@theme` tokens in `src/index.css` — one semantic token per item state (`Pending`, `Preparing`), valued from the current palette — and tiles are styled only through them (plus their label text via the shared `@lib/item-labels`). Repainting the panel is a two-line token edit; components never hardcode the state colors.

Alternative considered: hardcoding red/amber utilities in the tile component — rejected, that recreates the debt the tokens exist to avoid.

### 3. One small backend add-on: item notes

Notes exist end-to-end in the backend (domain `OrderItems.notes`, persisted `notes String?`, sent by the waiter's add-item payload) but `IKitchenQueueItem` does not expose them, so "notes if any" cannot render. The prerequisite slice is therefore minimal: the backend queue item gains a nullable `notes` field (its own unit spec update). `tableId`/`customerName`/`tableNumber` stay out — the panel deliberately shows no order-level data.

The frontend zod schema treats `notes` as optional-nullable (`z.string().nullish()`): until the backend slice lands, a queue without the field still renders (no notes line) instead of failing the whole board loudly. This is the one deliberate tolerance to the loud-at-the-seam convention — the field is a display nicety, not data the screen acts on. Every other field stays strict.

### 4. Shared order-item rules, catalog-style

When a second consumer appeared for the catalog, its contract moved to the shared layer (`@api/catalog.api.ts`, `@lib/catalog.ts`). The kitchen needs two rules that currently live in `pages/waiter/business/`, and contexts never import each other — so the same move applies:

- `cancellationReasonFormSchema` + `TCancellationReasonFormValues` → new `@lib/cancellation.ts`; the waiter's `CancelItemDialog`/`CancelOrderDialog` and their specs import from there; the kitchen's cancel dialog imports the same file.
- `ITEM_STATUS_LABELS` + `itemStatusLabel` → new `@lib/item-labels.ts`; the waiter's `labels.ts` drops them (keeping `ORDER_STATUS_LABELS`, which has a single consumer) and `order-detail.tsx` imports the shared file.

Alternative considered: duplicating both rules inside `pages/kitchen/business/`. Rejected — it splits `'Motivo é obrigatório'` across contexts and the last change already established the shared-move pattern for exactly this situation.

### 5. Kitchen context is thin — no `business/` folder

The kitchen has no pure business logic of its own beyond what the api module holds: listing schemas and query keys live in `api/kitchen.api.ts` (the `catalog.api`/`tables.api` precedent embeds listing schemas at the seam), item status chips use the shared `@lib/item-labels`, and the reason rule is shared too. `pages/kitchen/` therefore grows only `api/`, `hooks/`, `components/` and the page:

```
pages/kitchen/
  api/kitchen.api.ts            queue zod schemas + KITCHEN_QUEUE_KEY + listKitchenQueue
                                + start/finish/cancel verbs (void POSTs, waiter orders.api pattern)
  hooks/use-kitchen-queue.ts    query: refetchInterval 15s (named const), window-focus refetch
  hooks/use-start-preparation.ts / use-finish-preparation.ts / use-cancel-item-preparation.ts
                                mutations -> invalidate ['kitchen-queue']
  components/ItemTile/          one queue item: name, x qty, status chip, status color,
                                notes-if-any, action by status; busy while its mutation runs
  components/QueueColumn/       column title (Entrega | Local) + the flat tile stack + empty state
  components/CancelPreparationDialog/  reason dialog modeled on CancelOrderDialog
  pages/kitchen-page.tsx        header + Atualizar button + alerts + two QueueColumns
```

The queue zod schema narrows item `status` to `z.enum(['Pending', 'Preparing'])` and order `type` to the Local/Delivery union — a backend shape change fails loudly at the seam, per repo convention. (The order-type literal is re-declared here rather than shared; it is a two-value zod literal and this is only the second consumer.)

### 6. Per-tile actions and busy state without optimistic updates

Verbs return void; the UI reflects transitions on refetch, and `Ready`/cancelled tiles leave the queue automatically since the server no longer emits them. Each of the three mutations is used at the column level; a tile is busy when `mutation.isPending && mutation.variables.orderItemId === tile.orderItemId`, which keeps tiles independently clickable. Action errors surface in a page-level `role="alert"` banner via `toErrorMessage` (the order-detail refusal pattern); the queues themselves are untouched by a failed action. No optimistic updates — queue content is server truth and refetches within the poll window anyway.

### 7. Screen composition and states

`kitchen-page.tsx` keeps its single-file shape (it composes reusable components, it does not grow parts of its own): heading "Painel da Cozinha", an **Atualizar** button wired to `refetch()`, a load-error banner with the same button as retry, then the two `QueueColumn`s (Entrega, Local) in a responsive grid. Loading state "Carregando…" applies to the initial fetch only — background poll/refetch must not blank the board; the refresh button is disabled while a fetch is in flight.

## Risks / Trade-offs

- [Backend `notes` lands after the frontend build-up] → The contract is pinned in the spec and the zod schema treats the field as nullish, so tiles render without a notes line until the backend slice lands; the smoke test against the updated backend is the gate that exercises notes.
- [Two state colors with no design-system precedent] → Tokens in `@theme` keep the palette single-sourced from day one; components never hardcode the colors.
- [15s polling load] → The queue is a cheap filtered read on a local network; polling stops implicitly while the tab is hidden only if the query's `refetchIntervalInBackground` stays false (default).
- [Kitchen and waiter screens drift while both are open] → Accepted; the waiter flow refetches on window focus and the kitchen polls. Realtime is a documented non-goal.
- [Moving waiter exports churns existing specs] → Contained: the moved tests move with the code (`lib/cancellation.spec.ts`, `lib/item-labels.spec.ts`); waiter specs update imports only, same as the catalog move.

## Migration Plan

1. Backend slice first (sibling repo): the queue item gains nullable `notes`, unit spec updated.
2. Shared move (`@lib/cancellation.ts`, `@lib/item-labels.ts`) with waiter imports redirected — repo stays green at this commit.
3. Theme tokens in `src/index.css`, then the kitchen context + screen; final gate `prettier`/`lint`/`test`/`build` plus a dev-server smoke test against the updated backend.
4. Rollback: revert the kitchen commit(s) — the shared move is internal and the waiter screens keep working on either side of it.
