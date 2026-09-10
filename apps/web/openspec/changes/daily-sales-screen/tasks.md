## 1. Feature scenarios

- [x] 1.1 Update `features/07_manager_profile.feature`: the access Scenario Outline examples keep a single "Daily Earnings Report" row (no "Day's Sales" screen), and scenarios trace the delta spec against the report's "Vendas do Dia" section — "Manager lists the day's sales in the daily report" (closed local + delivered delivery sales with waiter, payment, sale time and items; open/cancelled stay out), "Manager filters the day's sales in the daily report" (by type, payment method and category; combined and cleared; the sold quantities per category follow the filtered sales). Verify: the wording matches the requirements in `specs/daily-sales/spec.md` and `openspec validate daily-sales-screen` passes.

## 2. Shared catalog join

- [x] 2.1 Add a catalog-by-id join helper to `lib/catalog.ts` and move the `REMOVED_ITEM_LABEL` fallback constant there; switch the waiter `business/enrich.ts` to the shared helper. Verify: new unit cases in `lib/catalog.spec.ts` cover found and missing ids, and the waiter enrich spec plus `npm test` stay green (no behavior change).

## 3. API contract & hook

- [x] 3.1 Create `src/pages/manager/api/daily-sales.api.ts`: zod schemas for the `GET /reports/daily-sales` rows (nullable `paymentType`, `closedAt`, `deliveredAt`, `waiterName`; `items` with `id, itemId, quantity, status`), `DAY_SALES_QUERY_KEY` and `getDaySales()` parsing at the boundary. Verify: colocated spec parses a realistic payload (a local sale closed by Pix and a delivery sale without payment) and rejects a malformed row; `npm test` green.
- [x] 3.2 Add `src/pages/manager/hooks/use-day-sales.ts` mirroring `useDailyEarnings` (one `useQuery` on `DAY_SALES_QUERY_KEY`). Verify: `npm run build` passes and the page spec in 5.2 consumes it green.

## 4. Shared labels & business rules

- [x] 4.1 Hoist the payment labels (`Cash → Dinheiro`, `CreditCard → Cartão`, `Pix → Pix`, with `PAYMENT_TYPES`) to `lib/payment-labels.ts` — the day-sales cards/filters and the waiter close-order dialog are two consumers — and keep the order-type labels (`Local → Local`, `Delivery → Entrega`) in `pages/manager/business/labels.ts` for the two day-view rows. Verify: colocated spec covers the maps and unknown-value fallbacks, and the existing earnings labels spec stays green.
- [x] 4.2 Create `pages/manager/business/enrich-sales.ts` (catalog join per sale line: `name`, `category`, `unitPrice`, with `REMOVED_ITEM_LABEL` and no category when the item left the menu) and `pages/manager/business/filter-sales.ts` (type / payment / category predicates over enriched sales, `categoryQuantities` in `CATEGORY_ORDER`). Verify: colocated specs cover the join + fallback, a removed-item line never matching a category filter, delivery sales never matching a payment filter, and predicates composing; `npm test` green.

## 5. Parts & the merged page

- [x] 5.1 Build the parts under `src/pages/manager/pages/daily-earnings/parts/`: `SalesFilters` (three chip rows with "Todos" clears), `CategoryStrip` (units sold per category across the given sales, in `CATEGORY_ORDER`, `categoryLabel` labels) and `SaleCard` (type tag, Mesa/Entrega, payment label or `—`, sale time, waiter, `formatBRL` total, inline item lines with name × qty and category tag). Verify: colocated component specs render given props and report chip clicks; `npm test` green.
- [x] 5.2 Rewrite `daily-earnings-page.tsx` (folder page) as the merged screen: keep the earnings h1/totals driven by `useDailyEarnings(filters.type ?? undefined)`, drop the report's standalone chip row, compose `SalesFilters` (its type row re-keys the totals query), then the h2 "Vendas do Dia" section with `CategoryStrip` over the filtered sales and one `SaleCard` per sale (or "Nenhuma venda…" when empty). Fetch sales + menu (shared `MENU_QUERY_KEY` cache), enrich, sort newest-first by `closedAt ?? deliveredAt`, and render loading / verbatim error with retry / empty states per the earnings page blocks — retry refetches report, sales and menu. Verify: the page spec asserts totals + list render together, type chips narrow totals (report query re-keyed) and list, payment/category chips leave the totals untouched while narrowing the list, an empty day keeps the totals with the empty message, and failed loads show backend messages as-is with retry; `npm test` green.

## 6. Route, nav and hub

- [x] 6.1 Keep the single day-report entry: `src/routes/router.tsx` imports the page from its folder (`/reports/daily-earnings`, Manager-only `RequireRole`), and neither `NAV_LINKS` nor `manager-page.tsx` gains or keeps any other day-sales entry. Verify: `npm run build` passes, `npm test` green, and a dev-server check with the seeded profiles shows the screen for `ana.gerente` (Cook sees `AccessDenied`).

## 7. Docs and final gate

- [x] 7.1 Update `.claude/rules/01-project-context.md`: the routes table keeps the single `/reports/daily-earnings` row (noting the day's-sales section), the 07 feature-mapping row notes the merged screen implemented, and the manager folder comment lists the moved files. Verify: the file matches `router.tsx`, `NAV_LINKS` and the manager page.
- [x] 7.2 Final gate: `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and a live check against the dev backend: `GET /reports/daily-earnings` and `GET /reports/daily-sales` as `ana.gerente` return schema-valid rows (Cook gets 403) and the screen renders them in `npm run dev`.
