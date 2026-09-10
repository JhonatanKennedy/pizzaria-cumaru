# Prisma & database rules

## 1. Never hand-edit `src/prisma/generated/`

The generated client is committed and its header marks it as generated. Edit `schema.prisma`, then regenerate with `npx prisma generate` (schema path comes from `prisma.config.ts`). The generator is the Prisma 7 new-style one:

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
}
```

## 2. No `url` in the datasource — the driver adapter provides connectivity

`schema.prisma` declares the datasource without a URL. `PrismaService` builds the adapter (as-is):

```ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }
}
```

Runtime reads `process.env.DATABASE_URL` directly, not via `@nestjs/config` (documented exception). `.env.local` (gitignored) holds the value; Postgres 16 runs via `docker-compose.yml` (user/pass `prisma`, db `pizzaria_cumaru`, port `5432`). The CLI (`npx prisma migrate …`, `npx prisma generate`) takes its env from `prisma.config.ts`, which loads `.env.local` and reads `datasource.url = env('DATABASE_URL')`.

## 3. Inject `PrismaService` — never construct it

`PrismaModule` is `@Global()`, so any provider gets it via constructor injection (see [05-nestjs.md](05-nestjs.md#5-constructor-injection--never-new-a-nest-provider)). Nest's DI is the only thing that may instantiate it — except the integration tests, which build the real client against the test database via the repository implementations.

## 4. Schema mirrors aggregates; enums persist as strings

`schema.prisma` models every aggregate — 9 models: `User`, `DeniedToken`, `Order`, `OrderItem`, `OrderCancellation`, `Item`, `Ingredient`, `ItemIngredient`, `Table` — with nine committed migrations under `apps/api/migrations/` (the path `prisma.config.ts` points at; migrations are not under `src/prisma/`). Conventions:

- **Enums are `String` columns** (`role`, `status`, `paymentType`, `type`, `category`) holding the domain enum's string value — the schema defines no Prisma `enum` types. Both the read and write paths validate through parse guards (`parseRole`, `parseItemCategory`, the guards in `orders/infrastructure/mappers/order-mapper.ts`) that throw `Unknown <thing>: <value>` — never persist or trust a raw string without one.
- **Ids:** `User.id` is `Int @id @default(autoincrement())`; every other aggregate is `String @id @default(uuid())`.
- **Deliberately denormalized:** `Order.userId` has no relation to `User`, and `OrderItem.itemId` / `OrderCancellation.itemId` have no relation to `Item`; prices are `Float`. Don't add relations without revisiting the open question in [08-conventions.md](08-conventions.md).
- **One `Json` column.** `OrderItem.flavors` holds a composed pizza's flavor parts (`[]` for a plain item) — the only non-scalar column in the schema; the mapper parse-guards it like any other untrusted value.
- **Column names are not always the domain's names.** `User.email` is where the domain's `login` is stored (`PrismaUserRepository` maps `row.email → login` on read and back on write) — the seeded logins are not addresses, and `User.name` exists in the table but no aggregate reads it. Check the repository/mapper before assuming a column is unused or missing.
- Status columns carry the full lifecycle (`failedAttempts`/`lockedUntil` on `User`, `closedAt`/`deliveredAt` on `Order`, the `DeniedToken` denylist table).

The domain stays logic-shaped (`Order.create` for new aggregates, `Order.restore` for rehydration); row ↔ aggregate translation happens in `infrastructure/` — `mappers/order-mapper.ts` for orders, inline parse guards and mapping in the repository files for catalog and users. No business rules in the schema layer, no persistence concerns in `domain/`.

## 5. Migrations

`migrations/` exists and is committed (nine migrations, created with `npx prisma migrate dev` against local Postgres). Extend the schema, then run `npx prisma migrate dev --name <what-changed>`; commit both the migration and the regenerated client like any source file. Never hand-edit a committed migration or `src/prisma/generated/`. `src/prisma/seed.ts` (via `npm run seed`) upserts the three seed users with bcrypt-hashed passwords and seeds the catalog — 12 ingredients, 20 items and 66 item-ingredient links, plus 10 tables. The item count is higher than `SEED_ITEMS` (10) because `SEED_ITEMS_WITH_SIZES` expands each pizza into its `G`/`M` variants. Rows are matched by name (`findFirst`) since catalog names have no DB unique constraint; the seed refuses to run when `NODE_ENV=production` — it is code, not a migration.
