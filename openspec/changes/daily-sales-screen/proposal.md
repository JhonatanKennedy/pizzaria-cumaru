## Why

The manager can see the day's takings (the Daily Earnings Report) but not the sales behind them — which orders were sold, by which waiter, with which payment, and how many drinks or pizzas went out. The backend now exposes the completed population (`GET /reports/daily-sales`, Manager-only — the sibling `daily-sales` change), so the data is one request away.

The earnings totals and the day's sales are the two day-views of the same population, and the manager reaches for them together — so this change delivers the sales listing **as a section of the existing Daily Earnings screen** (`/reports/daily-earnings`, "Relatório de Ganhos Diários"), not as a second screen.

## What Changes

- Extend the manager's daily report screen at `/reports/daily-earnings` with a "Vendas do Dia" section listing the day's completed sales — closed local orders and delivered delivery orders (the same population the totals sum) — newest sale first. Each sale shows its type (Local/Entrega), table or delivery context, payment method (delivery sales carry none and render a dash), sale time, responsible waiter, formatted total, and its items inline with catalog names and category tags.
- Filter the listing over the single day fetch: by **type** (Todos/Local/Entrega), by **payment method** (Todos/Dinheiro/Cartão/Pix) and by **category** (Todos + the `lib/catalog.ts` labels Pizzas/Pratos/Bebidas/Sobremesas/Acompanhamentos). Filters combine and clear independently.
- The **order-type chips double as the report's existing type selector**: choosing a type re-fetches the earnings totals for that type (server-side `?type=`), so totals and list narrow together; payment and category chips narrow only the sales list. The totals cards keep the current earnings behavior (three cards, or one card labeled with the type).
- Show sold quantities per category over the filtered subset — "how many drinks or pizzas were sold" — using the category tags from the same join.
- Add the manager-context API contract (zod schema for the sale rows, including `paymentType`, `closedAt` and `deliveredAt`) and a data hook over the shared `QueryClient` conventions; item names/categories come from a client-side catalog join in the waiter `enrich` style, with the removed-item label fallback.
- Update `features/07_manager_profile.feature` so the scenarios name the report's "Vendas do Dia" section (the report screen is the only day view; no `/reports/daily-sales` route, nav entry or hub card exists or is added).
- Loading and failed-load states follow the existing screen conventions; backend messages surface verbatim.

## Capabilities

### New Capabilities
- `daily-sales`: the manager's day view of the day's sales — every completed sale with its waiter, payment method, sale time, total and items, filterable by type, payment method and category, with a per-category sold-quantity summary. Delivered as the "Vendas do Dia" section of the Daily Earnings screen.

### Modified Capabilities
<!-- none — no main specs exist on disk; this change's delta spec is the spec of record -->

## Impact

- `src/pages/manager/pages/daily-earnings/` — the screen folder gains the day's-sales parts (`SalesFilters`, `CategoryStrip`, `SaleCard`); `daily-earnings-page.tsx` composes the earnings totals (from `useDailyEarnings(type)`) with the sales section.
- `src/pages/manager/` — context `business/` rules for filter logic (`filter-sales.ts`, `enrich-sales.ts`), `api/daily-sales.api.ts` contract and `hooks/use-day-sales.ts`.
- `src/lib/payment-labels.ts` — payment labels (`Cash → Dinheiro`, `CreditCard → Cartão`, `Pix → Pix`), shared with the manager day view and the waiter close-order dialog.
- `features/07_manager_profile.feature` — scenarios reworded to the report's "Vendas do Dia" section; `.claude/rules/01-project-context.md` — route table and feature mapping updated.
- Backend: consumed as-is; no changes needed.
