# Project context

`pizzaria-cumaru-backend` — backend for a pizzeria management system ("Pizzaria Cumaru"). Early-stage scaffold: several architectural layers exist only as empty shells or stubs. Feature specs live in `features/*.feature` (Gherkin, English) — read the relevant file before building an endpoint.

## Stack & tooling

| Concern | Choice |
| --- | --- |
| Language | TypeScript, `strict` mode, target ES2023 |
| Module system | Native ESM — `package.json` has `"type": "module"`, tsconfig uses `module`/`moduleResolution: NodeNext` |
| Framework | NestJS 12 |
| ORM | Prisma 7 with driver adapters (`@prisma/adapter-pg` + `pg`) |
| Database | PostgreSQL 16 (local via Docker Compose) |
| Config | `@nestjs/config` (`ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.local' })`) |
| Observability | `@nestjs/observe` (tracing/logs/metrics) — placeholder keys for now |
| Tests | Vitest (`globals: true`) + supertest, configured separately for unit vs e2e |
| Lint | oxlint (`oxlint.json`) |
| Format | Prettier — `singleQuote: true`, `trailingComma: "all"` (`.prettierrc`) |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run start` / `start:dev` / `start:prod` | Run; dev is watch mode |
| `npm run build` | Nest build to `dist/` |
| `npm test` | Unit tests (Vitest, picks up `**/*.spec.ts`) |
| `npm run test:e2e` | E2e tests (picks up `**/*.e2e-spec.ts`) |
| `npm run test:cov` | Coverage |
| `npm run lint` | oxlint over `src/ test/` |
| `npm run format` | Prettier write over `src/ test/` |

## Architecture

Modular monolith following a domain-driven, layered style. Each bounded context is a folder under `src/`:

```
src/<context>/
  domain/          # pure TS, no Nest/DB deps
    entities/      # aggregates & entities (one class per file)
    enums/         # one enum per file
    repositories/  # repository interfaces (currently empty)
  application/     # use-cases — stub classes scaffolded from features/*.feature, not implemented yet
  presentation/
    controllers/   # Nest HTTP controllers
    dtos/          # request DTOs
  <context>.module.ts
```

Implemented entry points:

- `src/main.ts` — bootstrap, uses `ObserveInstrument` from `app.module.ts`; listens on `process.env.PORT ?? 3000`
- `src/app.module.ts` — root module: global Config + Observe + `PrismaModule`; wires `AppController`, `OrdersController`
- `src/prisma/` — `PrismaModule` (`@Global()`), `PrismaService` (extends `PrismaClient`), `schema.prisma`

`AppController` (`/users`, `/users/test`) and `OrdersController` (`/orders`) contain throwaway/stub endpoints that return test strings or hit the DB directly — the real application/use-case layer is not built yet.

## Domain model (current state)

- **orders**: `Order` aggregate + `OrderItems` entity; statuses `EOrderStatus` (Open/Closed), `EOrderItemStatus` (Pending/Preparing/Ready/Cancelled); `EOrderType` (Delivery/Local); `EPaymentType` (Cash/CreditCard/Pix). `Order` holds a `tableId`-style flow via `type: LOCAL`. Order totals derived from item quantities/unit prices.
- **catalog** (`Item`, `Ingredient`, `EItemCategory`): menu items (Pizza/Dish/Drink/Dessert/Side) that can `linkIngredient` / track stock. `requiresPreparation` exists on `Item`.
- **users**: `User` entity — empty shell; `application/use-cases/` holds auth stubs (`authenticate-user`, `logout-user`).
- **kitchen**: new context — use-case stubs only (`list-kitchen-queue`, `finish-item-preparation`); no domain entities yet. Owns the "Kitchen Panel" flows.
- **restaurant**: currently a byte-for-byte copy of `catalog/` (see open questions in [08-conventions.md](08-conventions.md)).

**Persistence gap:** the Prisma schema only has one model (`User`); the orders/catalog aggregates above exist purely as in-memory TS classes. No `migrations/` folder exists yet and nothing maps the domain aggregates to DB tables.

## Feature specs

`features/*.feature` are the product specs — one file per flow (`03_table_order.feature`, `04_delivery_order.feature`, profiles for waiter/cook/manager...). Endpoints and e2e tests should trace back to scenarios in these files.
