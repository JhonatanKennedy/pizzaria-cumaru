# Design — Day's sales in the daily report ("Vendas do Dia")

## Context

See proposal.md — Why. The backend `GET /reports/daily-sales` (Manager-only, sibling change `daily-sales`) returns the day's completed population: closed local orders and delivered delivery orders with `waiterName`, `paymentType` (always null for delivery), `closedAt`/`deliveredAt`, `totalPrice` and `items` (`id, itemId, quantity, status`). Item names and categories are **not** in the payload — they come from a client-side join against `GET /items` (the same menu contract the waiter order detail joins). The existing Daily Earnings screen (`daily-earnings-page.tsx`, `/reports/daily-earnings`) is the house template for a manager day-view: chip filter row, totals cards, `Carregando…`, verbatim backend error with retry, `formatBRL`.

## Goals / Non-Goals

- Goal: the day's sales — inline items, three filter dimensions, per-category sold-quantity strip — delivered as a section of the daily earnings screen, sharing that screen's order-type selector with the totals.
- Non-goals: new backend query parameters for the listing (the day payload is small; listing filters are client-side — see proposal Out-of-scope note); enrichment on the backend; splitting the sales list into pagination; the manager's close-order/payment-entry flows (a separate change).

## Decisions

### 1. Placement: a "Vendas do Dia" section on the Daily Earnings screen

The sales listing joins the existing screen at `/reports/daily-earnings` (h1 "Relatório de Ganhos Diários" stays) as an h2 "Vendas do Dia" section under the totals and the filter chips. **No** `/reports/daily-sales` route, nav entry or hub card is added — the route table, `NAV_LINKS` and the manager hub keep the single day-report entry.

- *Why:* the earnings totals and the sales behind them are the two day-views of the same population and the manager consults them together; the product direction is one page, not two screens mirroring each other.
- Parts land under `src/pages/manager/pages/daily-earnings/parts/` (`SalesFilters`, `CategoryStrip`, `SaleCard`); the screen folder grows a `parts/` subfolder for the first time.

### 2. Totals follow the order type; the type row is shared

The sales filter's **order-type row is the earnings screen's existing type selector** (the standalone chip row the earnings page had is removed — one row, not two). Picking Local/Entrega/Todos re-keys `useDailyEarnings(type)` (server-side `?type=`, as today), so the totals cards and the sales list narrow together. Payment and category chips never touch the earnings query — they narrow the sales list only, and the totals stay at their current type scope.

- *Why:* the totals are server-side sums by order type — the only axis the backend report accepts — and the order-type row is the natural shared control. Payment/category have no server-side report, and the product decision keeps the totals honest to the report's definition rather than recomputing them client-side over a filtered list.

### 3. One fetch + the shared menu cache

`daily-sales.api.ts` in `pages/manager/api/` (sibling of `reports.api.ts`): zod `daySaleSchema` (rows as the backend sends them, `paymentType`/`closedAt`/`deliveredAt` nullable, `waiterName` nullable), `DAY_SALES_QUERY_KEY = ['reports', 'daily-sales']`, `getDaySales()` with `.parse` at the boundary. No query params — the endpoint is one small payload per day.

The catalog join uses the existing shared `listMenu`/`MENU_QUERY_KEY` from `@api/catalog.api.ts` (`useCatalog().menuQuery` already feeds the manager menu screen, so the day's menu is one shared cache entry). The screen enriches only after both queries resolve.

### 4. Enrichment: hoist the catalog-by-id join to `lib/catalog.ts`, reuse in both contexts

The waiter's `enrich.ts` already does the `itemId → name` join with the `REMOVED_ITEM_LABEL` fallback. The day-sales view is a second consumer of that exact behavior plus `category`. Rather than duplicate it (forbidden by the "second context consumes → hoist" convention), `lib/catalog.ts` gains a small `catalogById(menu): Map<string, TMenuItem>` and the shared `REMOVED_ITEM_LABEL`; waiter `enrich.ts` switches to it with no behavior change (its spec still passes); the manager's sales enrichment maps each line to `name`, `category` (from the menu item, `null` when the item was removed — such lines get no category chip and never match a category filter) and `unitPrice`.

- *Why:* one join, one fallback label. The waiter refactor is an import swap; no output changes.

### 5. Filtering: pure rules in the manager business folder

`pages/manager/business/filter-sales.ts` (pure TS + colocated spec) exposes `filterDaySales(sales, filters)` and `categoryQuantities(sales)`; the page holds one `TDaySalesFilters` state object (`type`, `payment`, `category`, each nullable) rendered as three chip rows each with its "Todos" clear chip — composition gives "filters combine and clear independently" for free, and the pure functions keep the matrix unit-testable without React.

Type labels `Local`/`Entrega` mirror the earnings page's `TYPE_LABELS` (`pages/manager/business/labels.ts`). Payment labels (`Cash → Dinheiro`, `CreditCard → Cartão`, `Pix → Pix`) move to `lib/payment-labels.ts` — the waiter close-order dialog (separate change) is the second consumer. All labels follow `lib/catalog.ts`-style `Record<string, string>` + fallback-to-value, keeping backend strings traceable.

### 6. Sale time, totals, and rows

Client orders the fetched sales newest-first by `closedAt ?? deliveredAt` (null-safe — exactly one of the two is always set). Local sales render a "Mesa" tag with the `tableId` verbatim; delivery sales render "Entrega" + no payment; payment renders through the label map, null as `—`. Waiter name falls back to `—`. The spec's loading/failure states and the empty day (`Nenhuma venda…`) follow the earnings page blocks, and an empty listing keeps the totals cards on screen (the report may be non-zero while nothing renders a sale row — e.g. only cancelled orders).

- *Risk:* `tableId` is an opaque id rendered as the table number; today ids equal the numbers, but a renumber flow could break the display. → Mitigation: render `tableId` verbatim after "Mesa " for now; revisit if table ids diverge from numbers (the payload has no `number`).

### 7. Screen structure

`pages/daily-earnings/` grows a parts folder (multi-part screen): `daily-earnings-page.tsx` owns the earnings query (`useDailyEarnings(filters.type ?? undefined)`), the sales query, the menu query, the filter state and the error/loading blocks; `parts/` holds `SalesFilters` (three chip rows, type row shared with the totals), `CategoryStrip` (units sold per category over the filtered sales, in `CATEGORY_ORDER`, labels via `categoryLabel` from `lib/catalog.ts`) and `SaleCard` (type tag, Mesa/Entrega, payment label or `—`, sale time, waiter, `formatBRL` total, inline item lines: name × qty, category tag). Only lines whose item matched the menu count toward a category; no-category lines are counted nowhere.

## Risks / Trade-offs

- [Table ids rendered as numbers may drift from real table numbers] → See decision 6 mitigation; backend payload change would be the durable fix, out of scope.
- [Removed items distort the quantity strip] → Their lines show `Item removido do cardápio` without a tag and are excluded from the strip — an explicit, visible accounting.
- [Duplicate day-view code between the report page and a future day view] → Accepted: the report page stays context-local and small; only genuinely shared rules (labels, join, format) live in `business/` or `lib/`.
- [Three chip rows crowd small screens] → Rows wrap (`flex-wrap`), same chip class as the earnings page.
- [Type chips re-fetch the earnings report on every toggle] → The per-type query is a small, cached request keyed by type (TanStack Query deduplicates); the totals always match the server's day report definition.

## Migration Plan

The earnings screen grows its sales section in place: page file rewritten in the folder it now lives in (`pages/manager/pages/daily-earnings/daily-earnings-page.tsx`, imports deepened by one level), parts added under `parts/`, route/nav/hub untouched (the single `/reports/daily-earnings` entry already exists). Rollback: revert the page and parts; the report page returns to its pre-change shape.

## Open Questions

None that change specs or tasks. (Delivery-payment flows and backend-side enrichment remain outside this change, per the proposal.)
