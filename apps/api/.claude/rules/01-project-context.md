# Project context

`apps/api` — the NestJS backend for a pizzeria management system ("Pizzaria Cumaru"), formerly the standalone `pizzaria-cumaru-backend` repo. Orders, catalog, tables, and users flows are implemented end-to-end (HTTP controller → application use-case → domain aggregate → repository interface → Prisma-backed implementation); kitchen is a thin context that drives `OrderItems` through orders use-cases. Feature specs live in the repo-root `features/*.feature` (Gherkin, English) — read the relevant file before building an endpoint. Remaining stubs and open design questions are tracked in [08-conventions.md](08-conventions.md).

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

| Command                       | Purpose                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run start` / `start:dev` | Run in development (`NODE_ENV=development`, reads `.env.local`); dev is watch mode                                          |
| `npm run start:prod`          | Run the built app in production (`NODE_ENV=production`, real env vars only)                                                 |
| `npm run build`               | Nest build to `dist/`                                                                                                       |
| `npm test`                    | Unit + integration tests (Vitest, picks up `**/*.spec.ts`)                                                                  |
| `npm run test:e2e`            | E2e tests (`**/*.e2e-spec.ts`, `vitest.config.e2e.ts` points `DATABASE_URL` at `TEST_DATABASE_URL`)                         |
| `npm run test:cov`            | Coverage                                                                                                                    |
| `npm run lint`                | oxlint over `src/ test/`                                                                                                    |
| `npm run format`              | Prettier write over `src/ test/`                                                                                            |
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
- `src/prisma/` — `PrismaModule` (`@Global()`), `PrismaService` (extends `PrismaClient`), `schema.prisma`, committed `generated/`, `seed.ts`. Migrations sit at the **app root** (`apps/api/migrations/`, wired by `prisma.config.ts`), not under `src/`

### Module wiring

| Module          | Imports                                         | Controllers (routes)                                                   | Notes                                                                                                                                 |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `AppModule`     | Config, Observe, Prisma, Orders, Kitchen, Users | —                                                                      | Registers the three global providers: `DomainErrorFilter`, `ValidationPipe({ whitelist: true, transform: true })`, `RolesGuard`       |
| `OrdersModule`  | Catalog                                         | `OrdersController` (`/orders`), `ReportsController` (`/reports`)       | 13 use-case files, all wired + `ORDERS_REPOSITORY` → `PrismaOrdersRepository`; exports the repo and the five use-cases kitchen drives |
| `CatalogModule` | —                                               | `ItemsController` (`/items`), `IngredientsController` (`/ingredients`) | 10 use-cases + `CATALOG_REPOSITORY` → `PrismaCatalogRepository`                                                                       |
| `KitchenModule` | Orders, Catalog                                 | `KitchenQueueController` (`/kitchen`)                                  | `ListKitchenQueueUseCase` only — no domain/infrastructure of its own                                                                  |
| `TablesModule`  | Orders                                          | `TablesController` (`/tables`)                                         | 4 use-cases + `TABLES_REPOSITORY` → `PrismaTablesRepository`; imports orders for the busy map and the delete block                    |
| `UsersModule`   | `JwtModule.registerAsync` (`JWT_SECRET`)        | `AuthController` (`/auth`)                                             | `AuthenticateUserUseCase`, `LogoutUserUseCase`, `USER_REPOSITORY` → `PrismaUserRepository`; exports repo + `JwtModule`                |

### Routes exposed today

| Controller               | Routes                                                                                                                                                                                                                                   | Roles               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `AuthController`         | `POST /auth/login` (`@Public`), `POST /auth/logout`                                                                                                                                                                                      | any / authenticated |
| `OrdersController`       | `POST /orders`, `GET /orders`, `POST /orders/:orderId/items`, `PATCH /orders/:orderId/status`, `PATCH /orders/:orderId/items/:itemId/quantity`, `POST /orders/:orderId/cancellation`, `POST /orders/:orderId/items/:itemId/cancellation` | Waiter, Manager     |
|                          | `POST /orders/:orderId/close`                                                                                                                                                                                                            | Manager only        |
| `ReportsController`      | `GET /reports/daily-earnings`, `GET /reports/daily-sales`                                                                                                                                                                                | Manager only        |
| `ItemsController`        | `GET /items`                                                                                                                                                                                                                             | Waiter, Manager     |
|                          | `POST /items`, `PATCH /items/:itemId`, `DELETE /items/:itemId`                                                                                                                                                                           | Manager only        |
| `IngredientsController`  | `GET /ingredients`                                                                                                                                                                                                                       | Waiter, Manager     |
|                          | `POST /ingredients`, `PATCH /ingredients/:ingredientId`, `PATCH /ingredients/:ingredientId/stock`, `DELETE /ingredients/:ingredientId`                                                                                                   | Manager only        |
| `KitchenQueueController` | `GET /kitchen/queue`, `POST /kitchen/orders/:orderId/items/:orderItemId/start` / `finish` / `cancel`                                                                                                                                     | Cook, Manager       |
| `TablesController`       | `GET /tables`                                                                                                                                                                                                                            | Waiter, Manager     |
|                          | `POST /tables`, `PATCH /tables/:tableId`, `DELETE /tables/:tableId`                                                                                                                                                                      | Manager only        |

## Domain model (current state)

- **orders** — `Order` aggregate + `OrderItems` entity. `Order.create` enforces the delivery
  rules (customer name + address required for `DELIVERY`) and that local orders carry a
  `tableId`; `Order.restore` / `OrderItems.restore` rehydrate persisted state. Item statuses
  (`EOrderItemStatus`) run `Pending → Preparing → Ready`, cancellable only while `Pending`
  (customer) or `Preparing` (kitchen); cancelling a whole order cascades over every remaining
  item and frees the table. Lifecycle, guarded transitions, money and ids: [06-domain.md](06-domain.md).
- **pizza composition** — a composed pizza is an `OrderItems` carrying `parts: TFlavorPart[]` (flavor + the fatias it occupies, base flavor first); a plain item carries none. The parts ride a `flavors Json` column on `OrderItem`, not a table of their own.
- **catalog** — `Item` (name, description, price, `EItemCategory`, `requiresPreparation`, linked ingredients) and `Ingredient` (name, in-stock flag). `domain/sizes.ts` derives a pizza's size from the trailing token of its name (`PIZZA_SIZES = ['M', 'G']`) and maps it to the fatia canvas a composed pizza must cover. Stock availability checks live in the add-item and kitchen-queue flows, not on the entities.
- **tables** — `Table` (id, unique `number`). `create`/`rename` validate `number >= 1` (`'Table number must be greater than zero'`); free/occupied is derived — a table is occupied while it has an open order, there is no status field.
- **kitchen** — no domain entities or enums; `KitchenQueueController` + `ListKitchenQueueUseCase` read orders and drive `OrderItems` through the orders context's exported use-cases.
- **users** — `User` entity (login, bcrypt hash, `EUserRole` Waiter/Cook/Manager) with failed-attempt lockout (`MAX_FAILED_ATTEMPTS = 5`, 15-minute lock). Auth is real: `POST /auth/login` issues a 1-hour JWT, `logout` denylists its `jti`. There is no create-user endpoint — users are seeded (`npm run seed`: `ana.gerente`, `joao.garcom`, `carlos.cozinha`).

## Feature specs

The repo-root `features/*.feature` are the product specs — one file per flow: `01_authentication`, `02_menu_and_stock`, `03_table_order`, `04_delivery_order`, `05_waiter_profile`, `06_cook_profile`, `07_manager_profile`, `09_cancellation_and_payment`, `10_table_management` (there is no `08`). Endpoints and e2e tests should trace back to scenarios in these files.
