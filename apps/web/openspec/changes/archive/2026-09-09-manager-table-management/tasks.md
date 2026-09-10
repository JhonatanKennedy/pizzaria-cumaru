## 1. Shared tables contract

- [x] 1.1 Add `createTable(number)`, `renameTable(tableId, number)` and `deleteTable(tableId)` to `@api/tables.api.ts` (no response parsing, like the catalog CRUD) and verify `npm run build` type-checks
- [x] 1.2 Verify the shared `tableListingEntrySchema` already covers the screen's needs (number, free/occupied, open-order total)

## 2. Screen shell

- [x] 2.1 Register `/manager/tables` in `router.tsx` guarded for Manager and verify the route renders for a Manager and denies a Waiter in a guard component spec
- [x] 2.2 Add the "Gerenciar mesas" hub card in `manager-page.tsx` and verify it renders and links to `/manager/tables`

## 3. Dialogs (parts)

- [x] 3.1 Build `RegisterTableDialog` and `RenameTableDialog` (shared number form, zod-positive-int, local pt-BR messages) and verify their specs submit the number and surface "Table number already exists" verbatim on refusal
- [x] 3.2 Build `RemoveTableDialog` with explicit confirmation and verify its spec confirms removal and surfaces "Cannot delete a table that has orders" verbatim on refusal

## 4. Screen behavior

- [x] 4.1 Build the tables screen listing tables sorted by number with free/occupied state and per-row actions, and verify the screen spec shows free and occupied rows with the open-order total
- [x] 4.2 Wire each mutation to invalidate `TABLES_QUERY_KEY` and verify the spec asserts the list refetches after register/renumber/remove (shared key with the waiter floor untouched)

## 5. Verification

- [x] 5.1 Run the full `npm test` suite, `npm run lint` and `npm run build` and verify zero failures and zero warnings
