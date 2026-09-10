## Context

The manager hub links to menu, reports and delivery — but not to the floor. The backend already ships the Manager-guarded table CRUD (`POST /tables`, `PATCH /tables/:id`, `DELETE /tables/:id` in the sibling repo, e2e-covered in `tables.e2e-spec.ts`); the waiter floor consumes only `GET /tables` through `@api/tables.api.ts`. This change is purely frontend: a Manager-only screen at `/manager/tables` (traces to `features/10_table_management.feature`). See proposal.md; requirements in specs/manager-table-management.

## Goals / Non-Goals

**Goals:**
- A Manager-only screen to register, renumber and remove floor tables, sharing the tables contract with the waiter floor.
- Backend refusal messages surfaced verbatim; every mutation reflects in the shared `['tables']` query.

**Non-Goals:**
- No backend changes (endpoints and guards already shipped).
- No waiter-visible changes: the floor keeps its current read-only behavior.

## Decisions

**D1 — Three mutations added to the shared `@api/tables.api.ts`.**
`createTable(number)`, `renameTable(tableId, number)` and `deleteTable(tableId)` next to `listTables`, reusing `apiRequest` with no local zod response parsing (all three return no body — mirroring the menu CRUD calls in `@api/catalog.api.ts`, which also parse nothing). Number validations live in the forms, not the api module.

**D2 — Screen at `/manager/tables`, guarded Manager, linked from the hub.**
A new screen under `pages/manager/pages/tables/` (folder screen — it grows parts), registered in `router.tsx` with `<RequireRole roles={['Manager']}>` like `/manager/delivery`. The hub (`manager-page.tsx`) gains a "Gerenciar mesas" card in the existing grid, tracing `10_table_management.feature`. A Waiter hitting the route gets `AccessDenied` — same guard machinery as every manager screen (unit-asserted via the guard, not a browser test).

**D3 — List + three action dialogs as page parts.**
The screen lists tables from the existing `tableListingEntrySchema` (number, free/occupied badge, open-order total when occupied) sorted by number, with per-row actions:
- *Register*: an "Adicionar mesa" affordance opening a number dialog.
- *Renumber*: per-row action opening the same dialog pre-filled with the current number.
- *Remove*: per-row action behind an explicit confirmation dialog ("Remover mesa N?"), since removal is destructive and refused by the backend when the table has orders.
Each dialog is a part folder (`RegisterTableDialog`, `RenameTableDialog`, `RemoveTableDialog`) following the delivery/menu dialog pattern: RHF + zod (`number` coerced int, positive), local pt-BR messages ("Número é obrigatório", "Número deve ser maior que zero"), root error rendered verbatim from `toErrorMessage` for the backend refusals ("Table number already exists", "Cannot delete a table that has orders").
*Alternative:* inline forms per row — rejected; dialog-per-action matches the menu and delivery patterns and keeps the list readable.
*Alternative:* disabling remove when `openOrder` is present — rejected as a *gate*: the backend refuses on order *history*, not just an open order, so the disable heuristic would both block legitimate removals and still surface refusals. The confirmation dialog + verbatim refusal is the honest single path.

**D4 — Mutations invalidate `TABLES_QUERY_KEY`, the key the waiter floor already shares.**
Each mutation wraps the fetch, then `queryClient.invalidateQueries({ queryKey: TABLES_QUERY_KEY })` — the same pattern the contexts already use for their shared keys. The waiter floor (auto-refreshing on its own cadence) picks up register/renumber/remove without code changes.
*Risk:* an occupied floor mutating under waiters mid-shift — the same consistency the waiter add-item flow already accepts; no optimistic updates.

**D5 — Number rules mirror the domain.**
The zod form allows any positive integer and lets the backend be the duplicate oracle (its "Table number already exists" is the spec'd message). No max bound client-side beyond sanity.

## Risks / Trade-offs

- [A waiter's floor query is stale right after a manager mutation] → staleTime + the shared invalidation cover it on next refetch; the floor already revalidates on its own cycle.
- [Table numbering gaps after removals] → intentional: renumbering exists precisely to tidy the floor; nothing renumbers automatically.
- [Duplicate submit while a dialog is open] → dialogs disable their confirm button while submitting (`isSubmitting`), the established dialog behavior.

## Migration Plan

None — frontend-only addition over the shipped endpoints.

## Open Questions

*None — the refusal texts and guard shape were verified in the sibling repo and the router.*
