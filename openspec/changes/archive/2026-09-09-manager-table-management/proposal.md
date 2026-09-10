## Why

The manager half of `10_table_management.feature` is unimplemented: the floor view exists for waiters, but the manager has no screen to register, renumber or remove tables — even though the backend endpoints are ready (`POST /tables`, `PATCH /tables/:tableId`, `DELETE /tables/:tableId`, all Manager-guarded, per the sibling repo's archived `table-management` change).

## What Changes

- A new Manager-only screen at `/manager/tables`, linked from the manager hub, listing every table (number, free/occupied with the open order's total) and offering the CRUD verbs the feature file specifies:
  - Register a table (with duplicate-number refusal surfaced verbatim).
  - Renumber a table (duplicate refusal verbatim).
  - Remove a free table, with confirmation; removal of a table that has orders refused with the backend message.
- Built on the existing menu-page patterns: list screen + dialogs + `ConfirmDialog` for removal; the shared `@api/tables.api.ts` contract grows create/rename/delete calls and their response schemas.
- Routes register `/manager/tables` under `RequireRole` Manager; the hub gains the entry point.

## Capabilities

### New Capabilities

- `manager-table-management`: the manager's table CRUD screen — register, renumber and remove tables, with backend refusals shown verbatim and free/occupied state visible.

### Modified Capabilities

- None.

## Impact

- `src/routes/router.tsx`, the manager hub, `@api/tables.api.ts` (three new calls + schemas), new manager pages/parts (table list + register/renumber dialogs), and colocated specs per the testing rules.
- No backend work: the endpoints and their domain rules are already shipped in the sibling repo.
