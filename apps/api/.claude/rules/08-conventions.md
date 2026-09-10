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
- **Two orders use-cases are still stubs** — `SplitBillUseCase` and `CreateDeliveryOrderUseCase` (bodies have a TODO comment). Kitchen has no domain/infrastructure of its own: it drives `OrderItems` through the orders context's exported use-cases. There is no create-user endpoint — users come from `npm run seed`.
- **Persistence mapping stays partly denormalized** — `Order.userId`, `OrderItem.itemId`, and `OrderCancellation.itemId` have no relations in `schema.prisma`; `Order.tableId → Table` gained a real FK (`onDelete: Restrict`) in the table-management change — confirm whether FKs are desired for the remaining columns before building on them (see [07-prisma.md](07-prisma.md#4-schema-mirrors-aggregates-enums-persist-as-strings)).
- **`EOrderStatus` mixes the order lifecycle (Open/Closed) with the delivery cycle (Preparing/Out for delivery/Delivered).** `PrismaOrdersRepository.findAllOpen` compensates with type-aware status filters; a separate delivery-state type may be cleaner as delivery reporting grows.
- **`LoginDto` lives inline in `auth.controller.ts`** instead of `presentation/dtos/` — move it when users get more endpoints.
- **Feature files skip `08`** (01–07, 09, and 10 exist) — renumber or fill in when new flows are specced.
