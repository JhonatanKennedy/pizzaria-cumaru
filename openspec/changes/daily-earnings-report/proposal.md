## Why

The Daily Earnings Report is the last placeholder of the manager area (`/reports/daily-earnings` renders `FeaturePlaceholder`). The backend already serves it (`GET /reports/daily-earnings`, Manager-only), so the manager cannot yet see the day's takings even though the data is one request away. The screen implements scenarios 43–59 of `features/07_manager_profile.feature` — the report totals and the type filter.

## What Changes

- Implement the Daily Earnings Report screen at `/reports/daily-earnings` (route and role guard already exist): the day's grand total plus the Local and Delivery subtotals, displayed with `formatBRL`.
- Support filtering the report by order type (Local / Delivery) and clearing the filter, tracing the scenario outline in `07_manager_profile.feature`.
- Add the manager-context API contract (`api/reports.api.ts` with a zod schema for `{ grandTotal, localTotal, deliveryTotal }`) and a `useDailyEarnings` hook over the shared `QueryClient` conventions.
- First consumer of `lib/format.ts` (`formatBRL`) — retires its "unused so far" debt note in `.claude/rules/08-conventions.md`.
- Backend error messages surface verbatim; loading and failed-load states match the kitchen-panel screen conventions.

## Capabilities

### New Capabilities
- `daily-earnings-report`: the manager's view of the day's earnings — grand total, Local and Delivery subtotals, filterable by order type.

### Modified Capabilities
<!-- none — this change introduces a new screen; no existing capability changes behavior -->

## Impact

- `src/pages/manager/` — new `api/`, `hooks/` and screen parts (the current `daily-earnings-page.tsx` placeholder is replaced); existing menu/stock code untouched.
- `src/routes/router.tsx` — no change (route, roles and page import exist).
- `src/lib/format.ts` — `formatBRL` gets its first caller.
- `.claude/rules/01-project-context.md` — route table + feature mapping updated to implemented; `.claude/rules/08-conventions.md` — drop the unused-`formatBRL` debt bullet.
- Backend: consumed as-is; no changes needed.
