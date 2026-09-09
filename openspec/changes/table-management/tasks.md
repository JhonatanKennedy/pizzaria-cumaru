## 1. Schema, migration, generated client

- [x] 1.1 Add `Table` model (`id` uuid, `number Int @unique`, `orders Order[]`) and `Order.table Table? @relation(fields: [tableId], references: [id], onDelete: Restrict)` to `src/prisma/schema.prisma`; verify `npx prisma migrate dev --name add_table_registry` creates `migrations/<ts>_add_table_registry/` and regenerates `src/prisma/generated/` (dev DB has no rows referencing tables, so it succeeds)
- [x] 1.2 Deploy the migration to the test DB: delete leftover orders in `pizzaria_cumaru_test` (`DELETE FROM "OrderCancellation"; DELETE FROM "OrderItem"; DELETE FROM "Order";`) then `DATABASE_URL="postgresql://prisma:prisma@localhost:5432/pizzaria_cumaru_test" npx prisma migrate deploy`; verify it reports the migration applied

## 2. Orders side

- [x] 2.1 Switch `orderDomainToCreate` to return `Prisma.OrderUncheckedCreateInput` (keeps the raw `tableId` scalar so FK violations surface as P2003, not P2025) and verify `npm run build` passes
- [x] 2.2 Wrap `save()`'s upsert in a try/catch translating `Prisma.PrismaClientKnownRequestError` code `P2003` into `Error('Table not found')`; verify with a new test in `src/orders/infrastructure/prisma-orders-repository.spec.ts` that saving an order with an unregistered `tableId` rejects with that message
- [x] 2.3 Add `existsOrderForTable(tableId): Promise<boolean>` to `IOrdersRepository` + Prisma implementation (counts ANY order, open or closed); verify the integration spec covers true/false

## 3. Tables context

- [x] 3.1 Create `src/tables/domain/entities/table.ts` (`Table.create`/`rename` reject numbers < 1 with `'Table number must be greater than zero'`, getters) and `src/tables/domain/entities/table.spec.ts`; verify `npm test` passes the entity spec
- [x] 3.2 Create `src/tables/domain/repositories/tables-repository.ts` (`ITablesRepository`: `findById`, `findByNumber`, `findAll`, `saveTable`, `deleteTable` + `TABLES_REPOSITORY` symbol)
- [x] 3.3 Create `src/tables/infrastructure/prisma-tables-repository.ts` (findUnique by id/number, findAll ordered by number asc, saveTable upsert, deleteTable) and its integration spec `prisma-tables-repository.spec.ts` (round-trip, ordering, delete; truncation order: orders before tables)
- [x] 3.4 Implement `create-table` use-case (duplicate → `'Table number already exists'`) with spec; verify in `tables-use-cases.spec.ts`
- [x] 3.5 Implement `list-tables` use-case (tables + `findAllOpen()` → `{ id, number, openOrder: { orderId, totalPrice } | null }`) with spec for both free and occupied entries
- [x] 3.6 Implement `rename-table` (unknown → `'Table not found'`, duplicate other table → `'Table number already exists'`, self-rename allowed) and `delete-table` (unknown → `'Table not found'`, has orders → `'Cannot delete a table that has orders'`) use-cases with specs
- [x] 3.7 Create `CreateTableDto`/`UpdateTableDto` (`@IsInt() @Min(1) number`), `TablesController` (GET Waiter+Manager; POST/PATCH/DELETE Manager), `tables.module.ts` (imports `OrdersModule`), register `TablesModule` in `app.module.ts`; verify `npm run build`

## 4. Roles, seed, docs in code

- [x] 4.1 Extend the permission-matrix comment in `src/common/guards/roles.guard.ts` (list tables Waiter+Manager; register/renumber/delete Manager)
- [x] 4.2 Add `SEED_TABLES = [1..10]` and the `// --- tables ---` idempotent block to `src/prisma/seed.ts` (extend the summary log); verify `npm run seed` runs and reports 10 tables

## 5. E2E

- [x] 5.1 Create `test/tables.e2e-spec.ts` covering: manager registers table → waiter lists it free → waiter opens an order on it → listing shows `openOrder` → delete refused 400 `'Cannot delete a table that has orders'` → renumber works → order for an unregistered table returns 400 `'Table not found'` → waiter POST /tables 403 → no token 401; verify `npm run test:e2e -- tables.e2e-spec.ts`
- [x] 5.2 Update the five existing e2e specs to seed Table rows and truncate `table` after `order` (order-creation, orders-checkout, order-status, delivery-order-status, catalog-management); verify `npm run test:e2e` fully passes

## 6. Feature files and docs

- [x] 6.1 Add `features/10_table_management.feature` (register/free, duplicate refused, free-busy listing, unregistered table refused, rename, delete blocked) and amend `features/03_table_order.feature` background to `And table "5" is registered and free`
- [x] 6.2 Update `.claude/rules/01-project-context.md` (module wiring + routes tables, domain model, 8→9 models with the FK note, feature list), `.claude/rules/08-conventions.md` (denormalization debt narrowed to `Order.userId`/`OrderItem.itemId`/`OrderCancellation.itemId`; mention `10` exists), `CLAUDE.md` context line, `README.md` endpoint table + seed note

## 7. Verification

- [x] 7.1 Run `npm run build && npm run lint && npm run format && npm test && npm run test:e2e` — all green
- [x] 7.2 Run `openspec validate table-management --strict` and `openspec validate --changes` — change validates
