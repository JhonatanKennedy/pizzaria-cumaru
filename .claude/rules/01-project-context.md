# Project context

`pizzaria-cumaru-backend` — backend for a pizzeria management system ("Pizzaria Cumaru"). Orders, catalog, tables, and users flows are implemented end-to-end (HTTP controller → application use-case → domain aggregate → repository interface → Prisma-backed implementation); kitchen is a thin context that drives `OrderItems` through orders use-cases. Feature specs live in `features/*.feature` (Gherkin, English) — read the relevant file before building an endpoint. Remaining stubs and open design questions are tracked in [08-conventions.md](08-conventions.md).

## Stack & tooling

| Concern       | Choice                                                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language      | TypeScript, `strict` mode, target ES2023                                                                                                                                                              |
| Module system | Native ESM — `package.json` has `"type": "module"`, tsconfig uses `module`/`moduleResolution: NodeNext`                                                                                               |
| Framework     | NestJS 12                                                                                                                                                                                             |
| ORM           | Prisma 7 with driver adapters (`@prisma/adapter-pg` + `pg`)                                                                                                                                           |
| Database      | PostgreSQL 16 (local via Docker Compose)                                                                                                                                                              |
| Config        | `@nestjs/config` (`ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.local', ignoreEnvFile: NODE_ENV === 'production', validate: validateEnv })`)                                             |
| Auth          | JWT via `@nestjs/jwt` + bcrypt; **no passport** — `RolesGuard` verifies tokens directly. Secret from `JWT_SECRET`; dev/test fall back to `'dev-secret-change-me'`, production requires it (fail-fast) |
| Observability | `@nestjs/observe` (tracing/logs/metrics) — placeholder keys for now                                                                                                                                   |
| Tests         | Vitest (`globals: true`) + supertest, configured separately for unit vs e2e                                                                                                                           |
| Lint          | oxlint (`oxlint.json`)                                                                                                                                                                                |
| Format        | Prettier — `singleQuote: true`, `trailingComma: "all"` (`.prettierrc`)                                                                                                                                |

**Modes are env-driven, never code-driven.** The npm scripts set `NODE_ENV=development` (start variants) or `NODE_ENV=production` (`start:prod`). Development reads `.env.local` (gitignored, holds `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`); production ignores env files entirely and reads real process variables — `src/config/env.validation.ts` (`validateEnv` hook) fails the boot when `DATABASE_URL` or `JWT_SECRET` is missing. `.env.example` (committed) is the contract of variables. Vitest sets `NODE_ENV=test`, which takes the same permissive path as development.

## Commands

| Command                       | Purpose                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run start` / `start:dev` | Run in development (`NODE_ENV=development`, reads `.env.local`); dev is watch mode                  |
| `npm run start:prod`          | Run the built app in production (`NODE_ENV=production`, real env vars only)                         |
| `npm run build`               | Nest build to `dist/`                                                                               |
| `npm test`                    | Unit + integration tests (Vitest, picks up `**/*.spec.ts`)                                          |
| `npm run test:e2e`            | E2e tests (`**/*.e2e-spec.ts`, `vitest.config.e2e.ts` points `DATABASE_URL` at `TEST_DATABASE_URL`) |
| `npm run test:cov`            | Coverage                                                                                            |
| `npm run lint`                | oxlint over `src/ test/`                                                                            |
| `npm run format`              | Prettier write over `src/ test/`                                                                    |
| `npm run seed`                | Build + seed the three profile users and the catalog (ingredients, items, links); refuses to run when `NODE_ENV=production` |

Postgres runs via `docker-compose.yml` (`prisma`/`prisma`, db `pizzaria_cumaru`, port `5432`).

## Architecture

Modular monolith following a domain-driven, layered style. Each bounded context is a folder under `src/`:

```
src/<context>/
  domain/          # pure TS, no Nest/DB deps
    entities/      # aggregates & entities (one class per file)
    enums/         # one enum per file
    repositories/  # repository interfaces + Symbol injection tokens
  application/
    use-cases/     # one class per use-case; orchestrates domain + repository
  infrastructure/  # repository implementations (Prisma); row mappers (orders only so far)
  presentation/
    controllers/   # thin Nest HTTP controllers
    dtos/          # request DTOs (class-validator)
  <context>.module.ts
```

Cross-cutting areas:

- `src/common/` — `guards/roles.guard.ts` (global `RolesGuard` + `@Roles()` / `@Public()` decorators), `filters/domain-error.filter.ts` (global exception → HTTP filter)
- `src/prisma/` — `PrismaModule` (`@Global()`), `PrismaService` (extends `PrismaClient`), `schema.prisma`, committed `generated/`, `migrations/`, `seed.ts`

### Module wiring

| Module          | Imports                                         | Controllers (routes)                                                   | Notes                                                                                                                           |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `AppModule`     | Config, Observe, Prisma, Orders, Kitchen, Users | —                                                                      | Registers the three global providers: `DomainErrorFilter`, `ValidationPipe({ whitelist: true, transform: true })`, `RolesGuard` |
| `OrdersModule`  | Catalog                                         | `OrdersController` (`/orders`), `ReportsController` (`/reports`)       | 12 use-cases + `ORDERS_REPOSITORY` → `PrismaOrdersRepository`; exports the repo and the three preparation use-cases for kitchen |
| `CatalogModule` | —                                               | `ItemsController` (`/items`), `IngredientsController` (`/ingredients`) | 13 use-cases + `CATALOG_REPOSITORY` → `PrismaCatalogRepository`                                                                 |
| `KitchenModule` | Orders, Catalog                                 | `KitchenQueueController` (`/kitchen`)                                  | `ListKitchenQueueUseCase` only — no domain/infrastructure of its own                                                            |
| `TablesModule`  | Orders                                          | `TablesController` (`/tables`)                                         | 4 use-cases + `TABLES_REPOSITORY` → `PrismaTablesRepository`; imports orders for the busy map and the delete block              |
| `UsersModule`   | `JwtModule.registerAsync` (`JWT_SECRET`)        | `AuthController` (`/auth`)                                             | `AuthenticateUserUseCase`, `LogoutUserUseCase`, `USER_REPOSITORY` → `PrismaUserRepository`; exports repo + `JwtModule`          |

### The HTTP contract, in three global pieces (all registered in `app.module.ts`)

- **Request shape** — every route's body is validated by the global `ValidationPipe` (`whitelist: true, transform: true`); DTOs are plain classes with class-validator decorators. Route params (`@Param`) and query strings are _not_ validated by the pipe.
- **Errors** — `DomainErrorFilter`: `HttpException`s keep their status; any other `Error` (domain rules throw plain `Error`s) becomes `400 { statusCode: 400, message }`.
- **Authorization** — `RolesGuard` runs on every route: `@Public()` skips it; otherwise the `Authorization: Bearer <JWT>` token is verified against `JWT_SECRET` and checked against the `DeniedToken` denylist (logout entries); `@Roles({ roles: [...] })` then gates by `EUserRole`. The role/permission matrix is documented in a comment at the top of `roles.guard.ts`.

### Routes exposed today

| Controller               | Routes                                                                                                                                                                             | Roles               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `AuthController`         | `POST /auth/login` (`@Public`), `POST /auth/logout`                                                                                                                                | any / authenticated |
| `OrdersController`       | `POST /orders`, `GET /orders`, `POST /orders/:orderId/items`, `PATCH /orders/:orderId/status`, `POST /orders/:orderId/items/:itemId/cancellation`                                  | Waiter, Manager     |
|                          | `POST /orders/:orderId/close`                                                                                                                                                      | Manager only        |
| `ReportsController`      | `GET /reports/daily-earnings`, `GET /reports/daily-sales`                                                                                                                           | Manager only        |
| `ItemsController`        | `GET /items`                                                                                                                                                                       | Waiter, Manager     |
|                          | `POST /items`, `PATCH /items/:itemId`, `PATCH /items/:itemId/price`, `DELETE /items/:itemId`, `POST /items/:itemId/ingredients`, `DELETE /items/:itemId/ingredients/:ingredientId` | Manager only        |
| `IngredientsController`  | `GET /ingredients`                                                                                                                                                                 | Waiter, Manager     |
|                          | `POST /ingredients`, `PATCH /ingredients/:ingredientId`, `PATCH /ingredients/:ingredientId/stock`, `DELETE /ingredients/:ingredientId`                                             | Manager only        |
| `KitchenQueueController` | `GET /kitchen/queue`, `POST /kitchen/orders/:orderId/items/:orderItemId/start` / `finish` / `cancel`                                                                               | Cook, Manager       |
| `TablesController`      | `GET /tables`                                                                                                                                                                       | Waiter, Manager     |
|                         | `POST /tables`, `PATCH /tables/:tableId`, `DELETE /tables/:tableId`                                                                                                                | Manager only        |

## Domain model (current state)

- **orders** — `Order` aggregate + `OrderItems` entity. `Order.create` enforces delivery rules (customer name + address required for `DELIVERY`); `Order.restore` / `OrderItems.restore` rehydrate persisted state (items, status, timestamps, cancellation history). Lifecycle: local orders go `Open → Closed`; delivery orders add the cycle `Preparing → Out for delivery → Delivered` — `EOrderStatus` carries all five members and use-cases guard the transitions. `close(paymentType, closedAt)` rejects empty and already-closed orders. Item statuses (`EOrderItemStatus`): `Pending → Preparing → Ready`; cancellable only while `Pending` (customer) or `Preparing` (kitchen). Money is a plain `number`; totals derive from `unitPrice * quantity`. Local orders are created against a `tableId` (`'Table is required for local orders'`).
- **catalog** — `Item` (name, description, price, `EItemCategory`, `requiresPreparation`, linked ingredients) and `Ingredient` (name, in-stock flag). Stock availability checks live in the add-item and kitchen-queue flows, not on the entities.
- **tables** — `Table` (id, unique `number`). `create`/`rename` validate `number >= 1` (`'Table number must be greater than zero'`); free/occupied is derived — a table is occupied while it has an open order, there is no status field.
- **kitchen** — no domain entities or enums; `KitchenQueueController` + `ListKitchenQueueUseCase` read orders and drive `OrderItems` through the orders context's exported use-cases.
- **users** — `User` entity (login, bcrypt hash, `EUserRole` Waiter/Cook/Manager) with failed-attempt lockout (`MAX_FAILED_ATTEMPTS = 5`, 15-minute lock). Auth is real: `POST /auth/login` issues a 1-hour JWT, `logout` denylists its `jti`. There is no create-user endpoint — users are seeded (`npm run seed`: `ana.gerente`, `joao.garcom`, `carlos.cozinha`).

## Persistence

The Prisma schema mirrors the aggregates — 9 models (`User`, `DeniedToken`, `Order`, `OrderItem`, `OrderCancellation`, `Item`, `Ingredient`, `ItemIngredient`, `Table`) — with six committed migrations under `migrations/`. Enums are stored as strings and validated by parse guards in the repository/mapper layer on both read and write; `Order.tableId → Table` has a real FK (`onDelete: Restrict`), while the remaining relations stay deliberately denormalized (no FK `Order → User`, `OrderItem → Item`). Ids: `User.id` is an `Int` autoincrement, all other aggregates are `String` with `uuid()` defaults. Details and mapping rules in [07-prisma.md](07-prisma.md).

## Feature specs

`features/*.feature` are the product specs — one file per flow: `01_authentication`, `02_menu_and_stock`, `03_table_order`, `04_delivery_order`, `05_waiter_profile`, `06_cook_profile`, `07_manager_profile`, `09_cancellation_and_payment`, `10_table_management` (there is no `08`). Endpoints and e2e tests should trace back to scenarios in these files.
