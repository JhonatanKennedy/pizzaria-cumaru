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

`schema.prisma` declares the datasource without a URL. `PrismaService` builds the adapter (as-is today):

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

Runtime reads `process.env.DATABASE_URL` directly, not via `@nestjs/config` (documented exception). `.env.local` (gitignored) holds the value; Postgres 16 runs via `docker-compose.yml` (user/pass `prisma`, db `pizzaria_cumaru`, port `5432`).

## 3. Inject `PrismaService` — never construct it

`PrismaModule` is `@Global()`, so any provider gets it via constructor injection (see [05-nestjs.md](05-nestjs.md#5-constructor-injection--never-new-a-nest-provider)). Nest's DI is the only thing that may instantiate it.

## 4. Schema stays persistence-shaped; domain stays logic-shaped

The schema currently has one model (`User`) while the domain aggregates are in-memory classes. When mapping arrives, use mappers between aggregates and rows — no business rules in the schema layer, no persistence concerns in `domain/`.

## 5. Migrations

`prisma.config.ts` sets `migrations.path: './migrations'` — the directory doesn't exist yet. Create it with `npx prisma migrate dev` when the first real tables land; commit migrations like any source file.
