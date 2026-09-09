## 1. Backend prerequisite (sibling repo — done before the frontend smoke gates)

- [ ] 1.1 In `pizzaria-cumaru-backend`, extend the kitchen queue item so each tile can show its notes: `ListKitchenQueueUseCase` exposes the order item's `notes` (nullable) on `IKitchenQueueItem`, and `list-kitchen-queue.spec.ts` asserts it. Verify: backend `npm test` green and `GET /kitchen/queue` returns `notes` on items that carry one.

## 2. Shared order-item rules (waiter refactor, stays green)

- [x] 2.1 Create `src/lib/cancellation.ts` with `cancellationReasonFormSchema` / `TCancellationReasonFormValues` moved from `pages/waiter/business/schemas.ts`, and a colocated `cancellation.spec.ts` carrying the moved tests. Verify: `npm test` green.
- [x] 2.2 Create `src/lib/item-labels.ts` with `ITEM_STATUS_LABELS` / `itemStatusLabel` moved from `pages/waiter/business/labels.ts`, and a colocated `item-labels.spec.ts`. Verify: `npm test` green.
- [x] 2.3 Point the waiter consumers at the shared modules: `labels.ts` keeps only the order-status part; `schemas.ts` drops the cancellation schema; `CancelItemDialog`, `CancelOrderDialog`, `order-detail.tsx` and the affected specs import from `@lib/cancellation` / `@lib/item-labels`. Verify: `npm test` green and `grep -rn "cancellationReasonFormSchema\|ITEM_STATUS_LABELS" src/pages/waiter/business` returns nothing.

## 3. Status color tokens

- [x] 3.1 Add two semantic tokens to `src/index.css` under `@theme` — one per item state (`Pending`, `Preparing`) — valued from the current palette, documented as the single repaint point. Verify: `npm run build` passes and the tokens compile to usable utilities (spot-check via a scratch class removed before the gate).

## 4. Kitchen API and hooks

- [x] 4.1 Create `pages/kitchen/api/kitchen.api.ts` — queue zod schemas (order `type` Local/Delivery union; item `status` narrowed to `Pending`/`Preparing`; item `notes` nullish), `KITCHEN_QUEUE_KEY`, `listKitchenQueue()` and the three void verbs `startItemPreparation` / `finishItemPreparation` / `cancelItemPreparation(orderId, orderItemId, reason)` (waiter `orders.api` pattern). Verify: colocated `kitchen.api.spec.ts` accepts a full queue payload (with and without `notes`) and rejects a wrong status/type; `tsc` passes.
- [x] 4.2 Create `hooks/use-kitchen-queue.ts` — query over `KITCHEN_QUEUE_KEY` with a named 15s `refetchInterval` (no background-interval refetch) and window-focus refetch, exposing `refetch` for the manual button. Verify: `tsc` passes.
- [x] 4.3 Create `hooks/use-start-preparation.ts`, `hooks/use-finish-preparation.ts` and `hooks/use-cancel-item-preparation.ts` — mutations over the verbs, each invalidating `KITCHEN_QUEUE_KEY` on success. Verify: `tsc` passes.

## 5. Kitchen components

- [x] 5.1 Create `components/ItemTile/` — name, quantity, status label via `@lib/item-labels`, tile background from the status tokens, notes line when present, action by status (`Pending` → Iniciar preparo; `Preparing` → Finalizar + Cancelar preparo), tile busy while its mutation is pending (keyed by `orderItemId`), and no order-level text anywhere. Verify: colocated spec asserts contents (incl. the notes line), status color class, per-status action visibility, busy disable and the absence of identifiers; `npm test` green.
- [x] 5.2 Create `components/QueueColumn/` — column title (Entrega / Local), the flat tile stack in payload order (no re-sorting), empty state, used twice on the screen. Verify: colocated spec asserts title, tile order as given and empty text; `npm test` green.
- [x] 5.3 Create `components/CancelPreparationDialog/` modeled on `CancelOrderDialog` — reason via the shared `cancellationReasonFormSchema`, submit "Cancelar preparo" / "Cancelando…", backend errors verbatim via `setError('root')`. Verify: colocated spec covers empty-reason validation, the confirm call with the reason, the close path and the verbatim error; `npm test` green.

## 6. Screen wiring

- [x] 6.1 Replace the placeholder in `pages/kitchen/pages/kitchen-page.tsx` — "Painel da Cozinha", Atualizar button (disabled while a fetch is in flight) wired to the query `refetch`, initial "Carregando…" state only, load-error banner (`toErrorMessage`) with the button as retry, action-error banner above the queues, and the two `QueueColumn`s (Entrega, Local). Verify: `npm test` green (screen spec mocks `use-kitchen-queue` and asserts refresh + error rendering) and `grep -rn "FeaturePlaceholder" src/pages/kitchen` returns nothing.

## 7. Rules sync

- [x] 7.1 Update `.claude/rules/01-project-context.md` — `/kitchen` route and `06_cook_profile` mapping to implemented (two item queues by arrival, per-tile verbs, 15s refresh, status color tokens); note the shared `@lib/cancellation.ts` / `@lib/item-labels.ts` modules in the `lib/` tree line. Verify: doc matches `find src -type f`.

## 8. Final gate

- [ ] 8.1 Run `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and smoke-check the dev server with the updated backend: `carlos.cozinha` sees Entrega and Local columns of anonymous colored tiles in arrival order, starts a dish (tile turns `Preparing` color), finishes it (tile leaves), cancels a preparation with reason (empty reason refused client-side), and tiles carrying notes show them.
