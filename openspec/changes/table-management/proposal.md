## Why

Local orders are opened against a free-form `tableId` string: any value is accepted, and no endpoint lists tables, so the waiter's floor view (which tables exist, which are occupied) cannot be built and typos create orders for phantom tables. The database diagram specifies a `Table` entity related to `Order` — this change makes tables a managed registry and links orders to it.

## What Changes

- **Table registry CRUD** — `POST /tables` (register by number), `PATCH /tables/:tableId` (renumber), `DELETE /tables/:tableId` (refused with "Cannot delete a table that has orders" while any order references it). Manager only.
- **Floor listing** — `GET /tables` (Waiter, Manager) returns every registered table with its open local order summary: `{ id, number, openOrder: { orderId, totalPrice } | null }`. One response serves the full registry, the floor view, and the occupied tables (`openOrder !== null`).
- **Orders reference real tables** — `Order.tableId` becomes a foreign key to `Table.id` (`onDelete: Restrict`). Creating a local order for an unregistered table is refused with "Table not found". Existing refusals ("Table is required for local orders", "Table already has an open order") are unchanged.
- **Persistence** — new `Table` model (`id` uuid, `number Int @unique`); `IOrdersRepository` gains `existsOrderForTable`.
- **Seed** — `npm run seed` registers tables 1–10.

## Capabilities

### New Capabilities

- `tables/management`: registering, renumbering, and deleting tables, and the floor listing with per-table open-order summary.

### Modified Capabilities

- `orders/order-creation`: creating a local order now requires the table to be registered; unregistered tables are refused with "Table not found".

## Impact

- `src/prisma/schema.prisma` — `Table` model + `Order.table` relation; new migration under `migrations/`; regenerated client.
- `src/tables/` — new bounded context (domain, application, infrastructure, presentation, module), mirroring `src/catalog/`.
- `src/orders/` — `order-mapper.ts` switches the create mapping to `Prisma.OrderUncheckedCreateInput` (the checked input drops the `tableId` scalar once the relation exists); `prisma-orders-repository.ts` translates FK violations (P2003) to "Table not found" and implements `existsOrderForTable`.
- `src/app.module.ts` — registers `TablesModule`.
- `src/common/guards/roles.guard.ts` — permission matrix comment gains the table routes.
- `src/prisma/seed.ts` — tables 1–10.
- `features/` — new `10_table_management.feature`; `03_table_order.feature` background gains "registered" ("And table 5 is registered and free").
- `test/` — new `tables.e2e-spec.ts`; five existing e2e specs seed Table rows before posting orders; docs updated (CLAUDE.md, rules, README).

**Prerequisites**: none (catalog-crud and kitchen-cancel-preparation are complete; this change builds on the orders/catalog contexts as-is).
**Out of scope**: multi-flavor components (`OrderItemComponents` in the diagram), table status beyond free/occupied, seat counts, combining tables.
