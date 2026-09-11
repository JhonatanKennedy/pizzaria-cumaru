# Project conventions

## 1. ESM import specifiers always end in `.js`

Even for `.ts` files (NodeNext ESM). Never `./x` or `./x.ts` in real imports.

```ts
// ✅
import { Order } from '../entities/orders.js';
import { OrderItems } from './order-items.js';

// ❌
import { Order } from '../entities/orders';
import { OrderItems } from './order-items.ts';
```

## 2. File naming

| Kind       | Pattern                        | Examples                                  |
| ---------- | ------------------------------ | ----------------------------------------- |
| Entity     | bare kebab, one class per file | `orders.ts`, `order-items.ts`, `items.ts` |
| Enum       | bare kebab                     | `order-status.ts`, `payment-type.ts`      |
| Controller | `*.controller.ts`              | `orders.controller.ts`                    |
| DTO        | `*.dto.ts`                     | `create-order.dto.ts`                     |
| Use-case   | bare kebab, one class per file | `create-order.ts`, `close-order.ts`       |
| Module     | `*.module.ts`                  | `orders.module.ts`                        |

## 3. Language

Code, identifiers, comments, tests, and the Gherkin specs in the repo-root `features/` are all in English.

## 4. Format & lint before committing

Prettier (`singleQuote: true`, `trailingComma: "all"`) and oxlint are configured — run `npm run format` and `npm run lint` and keep both passing.

## 5. Error messages

Domain errors are short, capitalized, human-readable strings thrown via `throw new Error(...)`: `'Cannot change a closed order'`, `'Name is required'`, `'Quantity must be greater than zero'`, `'Item not found'`. They surface to API responses as `400` bodies through the global `DomainErrorFilter` (see [05-nestjs.md](05-nestjs.md#1-thin-controllers)), so write them for a user, not a developer.

## 6. Observability

`app.module.ts` exports `{ ObserveModule, ObserveInstrument }` from `@nestjs/observe`, configured with placeholder `YOUR_APP_KEY` / `YOUR_APP_SECRET`. `main.ts` passes `instrument: ObserveInstrument` to `NestFactory.create`. Leave as-is unless asked.

## 7. Known debt & open questions

Resolved since the scaffold (not listed here anymore): the duplicated `restaurant/` context and the `ingridients.ts` typo are gone, repository interfaces are implemented, the `/orders` stub endpoints were replaced by real use-cases, and global error handling, DTO validation, and JWT auth now exist.

Open today — revisit before building on the affected code:

- **DTO validation duplicates enum values as literals.** `CloseOrderDto` and `UpdateDeliveryOrderStatusDto` hard-code `@IsIn(['Cash', 'CreditCard', 'Pix'])`-style lists that mirror `EPaymentType` / `EOrderStatus`; `OrdersController.PAYMENT_TYPE_BY_VALUE` and the `?type=` filter in `ReportsController` repeat `EPaymentType` / `EOrderType` values again. `CreateOrderDto` imports the enum — standardize the rest on `@IsIn([EnumMember, …])` / `@IsEnum(...)` so each value has one source of truth.
- **Route params are unvalidated.** `@Param('orderId')`, `@Param('itemId')`, `@Param('ingredientId')` pass through as raw strings; revisit with `ParseIntPipe`/format checks when ids need stricter guarantees.
- **Split bill is specified but unbuilt.** `features/09_cancellation_and_payment.feature` describes it; the orders context has no use-case for it (the scaffolds that stood in for one — `split-bill.ts` and `create-delivery-order.ts` — were deleted as dead files, the second because `CreateOrderUseCase` already handles delivery). Write it against the aggregate, don't resurrect an empty class. Kitchen has no domain/infrastructure of its own: it drives `OrderItems` through the orders context's exported use-cases. There is no create-user endpoint — users come from `npm run seed`.
- **Persistence mapping stays partly denormalized** — `Order.userId`, `OrderItem.itemId`, and `OrderCancellation.itemId` have no relations in `schema.prisma`; `Order.tableId → Table` gained a real FK (`onDelete: Restrict`) in the table-management change — confirm whether FKs are desired for the remaining columns before building on them (see [07-prisma.md](07-prisma.md#4-schema-mirrors-aggregates-enums-persist-as-strings)).
- **`EOrderStatus` mixes the order lifecycle (Open/Closed) with the delivery cycle (Preparing/Out for delivery/Delivered).** The rule tables in `orders/domain/order-progress.ts` and `order-sales.ts` now carry the per-type split (`Record<EOrderType, …>`, so a type added without a decision there is a compile error) and the adapters translate them into a `where`; a separate delivery-state type may still be cleaner as delivery reporting grows.
- **A `Delivery` order carrying a `tableId` no longer occupies the table.** `findOpenByTableId` now states its rule as `{ type: EOrderType.LOCAL, status: EOrderStatus.OPEN, tableId }`; before, it filtered on `{ status: 'Open', tableId }` and so would find a delivery order that had been given a table. `CreateOrderDto` still accepts `tableId` on a delivery and `Order.create` does not forbid it, so the hole is reachable — no test covers it. Close it on the write side (refuse a `tableId` on a delivery) rather than by loosening the read.
- **`OrderItems.create` does not validate `parts`, so an unreadable row can be written.** The write side takes `params.parts ?? []` unchecked, while `isFlavorPart` guards the `flavors` column on the way _out_ of the database. A caller passing `{ name: 'Mussarela G', pieces: -1 }` therefore persists fine and every subsequent read of that order throws `'Invalid flavor parts on order item'` — the row is unreachable through the application. Close it on the write side (`OrderItems.create` running `isFlavorPart` over `parts`) so the invariant holds at both ends, the way `quantity` and `unitPrice` already do. `add-item-to-order.ts` builds parts from a request, so the hole is reachable.
- **What `npm test` structurally cannot prove.** The suite opens no connection, so nothing in it shows that Postgres honours the `where` an adapter builds — only that the adapter mirrors the domain's rule tables. `test/`'s e2e specs are the closure for both that and for a domain `Error` reaching the client as a `400`; `DomainErrorFilter`'s own spec pins the mapping in isolation, not the path to it. Don't move a rule into a repository because "there's no test for it" — write the test.
- **The e2e suite is not independent.** Seven of the eight specs under `test/` hand-duplicate a foreign-key-ordered `deleteMany()` chain in `beforeEach` against one shared test database, and reach persistence with `app.get(PrismaService)`, so they are order-dependent by construction and `vitest.config.e2e.ts` sets `fileParallelism: false` to hide it. The unit suite does not share this defect: `PrismaService` appears in the four adapter specs only as the type in `double as unknown as PrismaService`, never constructed. [02-testing.md](02-testing.md) states independence with no carve-out; the gap is recorded here, not written into the rule.
- **Nothing type-checks the specs.** `nest build` excludes `test/`, and Vitest transpiles without checking, so `tsc -p tsconfig.json --noEmit` was carrying 11 errors in spec files — a `symbol` compared against the string reflection keys, an `order.close()` called with no arguments, a write into a `readonly TFlavorPart[]`, and `import { App } from 'supertest/types'` missing the `.js` specifier that [rule 1](#1-esm-import-specifiers-always-end-in-js) requires under NodeNext. All four are fixed and the check is clean, but nothing keeps it that way: no `typecheck` script exists and no command runs the compiler over the specs. Add one (`tsc -p tsconfig.json --noEmit`) and call it from the gate before the next spec-shaped regression rides in behind `npm test` passing.
- **`LoginDto` lives inline in `auth.controller.ts`** instead of `presentation/dtos/` — move it when users get more endpoints.
- **Feature files skip `08`** (01–07, 09, and 10 exist) — renumber or fill in when new flows are specced.
