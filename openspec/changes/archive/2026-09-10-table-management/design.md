## Context

`Order.tableId` is a free-form nullable string with no registry, no FK, and no validation; nothing in the API lists tables, so the waiter's floor view has no source of truth. The database diagram specifies `Table { id, number }` related to `Order`. The codebase's layered DDD style (catalog is the CRUD template) and its module conventions (kitchen imports orders exports) shape the implementation.

## Goals / Non-Goals

**Goals:**

- A Table registry with manager CRUD and a waiter-facing floor listing.
- Orders reference real tables; local order creation refuses unregistered tables.
- Delete is safe: a table with orders cannot be removed.

**Non-Goals:**

- `OrderItemComponents` (multi-flavor pizza components in the diagram) — separate feature.
- Table status beyond free/occupied, seat counts, combining tables.
- Retroactively changing delivery orders (they stay unlinked to tables).

## Decisions

### D1. Table model and the FK

New `Table` model (`id String @id @default(uuid())`, `number Int @unique`, `orders Order[]`) and `Order.table Table? @relation(fields: [tableId], references: [id], onDelete: Restrict)`. `Order.tableId String?` stays — delivery orders keep it null. Restrict is explicit: the DB is the backstop behind the use-case refusal, and order history can never lose its table. Alternative considered: keep the column denormalized and validate in the use-case — rejected (the diagram specifies the relation and the user chose the FK; existence checking becomes race-free).

### D2. Floor listing payload

`GET /tables` returns `{ id, number, openOrder: { orderId, totalPrice } | null }` for every registered table. The busy map comes from the existing `IOrdersRepository.findAllOpen()` — no new read query; the listing is a read model composed in `ListTablesUseCase`. Alternatives considered: `hasOpenOrder: boolean` only — rejected (the waiter app would still need `GET /orders` plus a client-side join for the most common screen); persisting an availability column — rejected (drift risk, same reasoning as catalog's derived availability).

### D3. Module wiring stays acyclic

`TablesModule` imports `OrdersModule` (consumes the exported `ORDERS_REPOSITORY` for the busy map and the delete check). `OrdersModule` does NOT import `TablesModule`: on creation, table existence is enforced by the FK itself — `PrismaOrdersRepository.save()` catches Prisma `P2003` and rethrows `Error('Table not found')`. Alternatives considered: `forwardRef` both ways for an explicit pre-check — rejected (adds a cycle for no gain; the FK check is race-free); putting tables inside the orders context — rejected (tables deserve their own context, mirroring catalog).

### D4. Create mapping uses the unchecked Prisma input

`orderDomainToCreate` returns `Prisma.OrderUncheckedCreateInput`. Once the relation exists, the generated checked `OrderCreateInput` drops the `tableId` scalar, and switching to `table: { connect }` would raise P2025/P2018 instead of P2003 — the decided translation would silently never fire. The unchecked input keeps the raw `tableId` scalar so the database raises the FK violation the save() catch translates.

### D5. CRUD error contract

Domain `Table.create`/`rename` reject numbers below 1 (`'Table number must be greater than zero'`, mirroring the orders quantity message, named constant per house rules). Use-cases own the other refusals: duplicate number `'Table number already exists'` (self-rename allowed), unknown id `'Table not found'`, delete with orders `'Cannot delete a table that has orders'` (checked via new `existsOrderForTable` — ANY order, open or closed, blocks deletion). All surface as 400 through the global `DomainErrorFilter`.

### D6. Roles

Listing is Waiter + Manager (like `GET /items`); create/renumber/delete are Manager only (like catalog writes). The guard's permission-matrix comment gains the four routes.

### D7. Seed

`npm run seed` registers tables 1–10 (find-by-number/create, idempotent like the catalog block) so local development and e2e fixtures start with a working floor.

## Risks / Trade-offs

- [Existence check lives in persistence (P2003 translation)] → The error contract is shared with every other FK the create path could hit; today `tableId` is the only one, and the catch is documented at the call site.
- [Renumbering changes history's reading] → Orders store `tableId` (the immutable id), not the number, so history follows renames; a printed receipt always shows the current number. Accepted.
- [Test DB may hold pre-migration orders] → `migrate deploy` on `pizzaria_cumaru_test` requires deleting leftover orders first (documented in tasks).

## Open Questions

None.
