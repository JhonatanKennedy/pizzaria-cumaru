## Context

The screen exists as a placeholder (`pages/manager/pages/daily-earnings-page.tsx`) behind an already-guarded Manager route (`/reports/daily-earnings`). The backend contract is ready and Manager-only: `GET /reports/daily-earnings?type=Local|Delivery` returns `{ grandTotal, localTotal, deliveryTotal }`; with a type filter the backend zeroes the other subtotal and sets `grandTotal` to the filtered sum (see `get-daily-earnings-report.ts`). Totals are reais-valued numbers — every existing screen feeds `formatBRL` its values directly (`order-detail.tsx:135`, `AddItemPanel`, `MenuTab`), with no cents conversion, so the report does the same. See proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- One Manager-only screen replacing the placeholder: three totals (grand, Local, Delivery) in BRL and a type filter (Local / Delivery) with a clear path back to all three.
- Follow the context conventions exactly: zod-validated contract at the api boundary, hook over the shared `QueryClient`, error messages verbatim, loading/failure/retry states.
- Make `lib/format.ts` (`formatBRL`) the single money formatter — its first caller.

**Non-Goals:**
- No auto-refresh or periodic polling. Report data changes only when orders close; the shared query defaults (revalidate on window focus, standard `staleTime`) keep it fresh enough when the manager returns to the tab.
- No shared/hoisted contract: unlike the menu (`api/catalog.api.ts`, consumed by two contexts), this report is Manager-only, so the contract stays inside `pages/manager`.
- No changes to the waiter or kitchen contexts, and no backend work.

## Decisions

1. **Contract stays context-local, parsed with zod.** `pages/manager/api/reports.api.ts` declares the query key, `getDailyEarningsReport(type?)` calling `apiRequest` and parsing `dailyEarningsReportSchema` (numbers, all three fields). Rationale: the http-seam and validation rules apply to every api module (`apiRequest` returns `unknown`; parse before use); no second context consumes this endpoint. Alternative considered: top-level `api/reports.api.ts` — rejected, it would hoist Manager-only code with no second consumer (the `catalog.api.ts` pattern is for genuinely shared contracts).

2. **Filtering is server-side, one query per filter.** Query key shaped `['reports', 'daily-earnings', type]` where `type` is `'Local' | 'Delivery' | undefined` (undefined = all three). Selecting a chip issues the real filtered request; the backend response is the single source of truth and the cache holds one entry per filter. Alternative considered: fetch once and hide totals client-side — rejected: it duplicates backend semantics in the UI (the filtered response deliberately zeroes the other subtotal), never exercises the API's `type` contract, and would show stale "other type" numbers the spec says must not appear.

3. **Filtered view shows exactly one total.** With `type` active the screen shows only that type's total (the spec scenario asserts only the filtered value is displayed); "Todos" (clear) restores the three-total summary. UI labels follow the app's existing order-type wording for delivery orders — the kitchen queues already name the two streams "Entrega" and "Local" — with a day-level label for the grand total; exact strings are pinned by component tests.

4. **Screen stays a single file.** The page is small (totals + a chip row + states); per the context skeleton, single-file screens stay single files, so `daily-earnings-page.tsx` is rewritten in place with a colocated spec, and small presentational bits that earn their own tests live in `parts/` only if the file grows past that.

5. **Failure/retry follows the established screen pattern.** Pending → "Carregando…"; query error → banner with `toErrorMessage(error)` (backend message verbatim) and a retry wired to the query `refetch`; mutation-less, so no action-error surface.

## Risks / Trade-offs

- **Money-unit assumption** (totals are reais values `formatBRL` can render directly, matching every existing screen) → the smoke gate verifies a seeded day's report against the real backend and asserts values like the spec's (R$ 480,00 / R$ 210,00 / R$ 690,00); if the unit ever differs, only the formatting call sites change, not the contract.
- **Stale numbers on screen** if an order is closed in another tab while the report is open → window-focus refetch plus the standard `staleTime` covers tab returns; no auto-refresh by design (see Non-Goals).
- **Filter-state loss on error/refetch** → the chip row is derived from the same state that drives the query key, so the active filter and the shown data can never disagree.

## Migration Plan

None — greenfield screen on an existing guarded route; the placeholder file is replaced in place and the route import is unchanged. Rollback is reverting the single-page change.

## Open Questions

None.
