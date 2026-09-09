# Pizzaria Cumaru — Backend

Backend of the pizzeria management system "Pizzaria Cumaru": table and delivery orders, kitchen panel, menu and stock management, checkout and daily reports, with role-based access for waiters, cooks, and managers.

## Stack

- **TypeScript** (strict, ES2023) + **NestJS 12**, native ESM
- **Prisma 7** with `@prisma/adapter-pg` + **PostgreSQL 16** (Docker Compose)
- **Vitest** (unit + e2e), **supertest**, **oxlint**, **Prettier**
- Product specs: Gherkin files in `features/` (English)

## Setup

```bash
npm install
docker compose up -d          # PostgreSQL on :5432 (user/pass: prisma)

# .env.local (gitignored) needs the connection string:
#   DATABASE_URL="postgresql://prisma:prisma@localhost:5432/pizzaria_cumaru"
#   TEST_DATABASE_URL="postgresql://prisma:prisma@localhost:5432/pizzaria_cumaru_test"
#   JWT_SECRET="<change-me>"
# Create the test database once (integration/e2e tests use it):
#   docker exec pizzaria-cumaru-backend-db-1 psql -U prisma -d postgres \
#     -c 'CREATE DATABASE pizzaria_cumaru_test;'

npx prisma migrate dev        # applies migrations to the dev DB
npx prisma migrate deploy     # applies migrations to the test DB (point DATABASE_URL at it)
npm run seed                  # seeds profile users, the menu catalog, and tables 1-10 (refuses in production)
```

## Running

```bash
npm run start:dev   # watch mode
npm run build       # compile to dist/
npm test            # unit + integration tests
npm run test:e2e    # HTTP journeys against the test DB
npm run lint        # oxlint
```

## Testing the API

1. Seed users and the catalog (`npm run seed`).
2. Start the server.
3. Log in and copy the token:

```bash
curl -X POST localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"ana.gerente","password":"SenhaSegura123"}'
# -> { "token": "...", "user": { "id": 1, "login": "ana.gerente", "role": "Manager" } }
```

All other endpoints require `Authorization: Bearer <token>`. Seeded users:

| Login | Role | Password |
| --- | --- | --- |
| `ana.gerente` | Manager | `SenhaSegura123` |
| `joao.garcom` | Waiter | `SenhaSegura123` |
| `carlos.cozinha` | Cook | `SenhaSegura123` |

## Endpoints and roles

| Endpoint | Action | Waiter | Cook | Manager |
| --- | --- | :-: | :-: | :-: |
| `POST /orders` | create local / delivery order | ✓ | | ✓ |
| `POST /orders/:id/items` | add item (flavors, notes) | ✓ | | ✓ |
| `POST /kitchen/orders/:orderId/items/:itemId/start` / `finish` | start / finish preparation (`Preparing`, `Ready`) | | ✓ | ✓ |
| `POST /orders/:id/items/:itemId/cancellation` | cancel item (refused once `Preparing`) | ✓ | | ✓ |
| `PATCH /orders/:id/status` | advance delivery cycle (`Preparing` → `Out for delivery` → `Delivered`) | ✓ | | ✓ |
| `POST /orders/:id/close` | close with payment, optional `splitInto` (refused while any kitchen item is still `Pending`/`Preparing`) | | | ✓ |
| `GET /kitchen/queue` | the two kitchen queues | | ✓ | ✓ |
| `POST /kitchen/orders/:orderId/items/:itemId/cancel` | cancel the preparation of a started dish | | ✓ | ✓ |
| `GET /orders` | day's orders with waiter name | ✓ | | ✓ |
| `GET /reports/daily-earnings` | day's earnings (`?type=Local\|Delivery`) | | | ✓ |
| `GET /tables` | floor listing (each table with its open order summary) | ✓ | | ✓ |
| `POST /tables` | register table (`{ number }`) | | | ✓ |
| `PATCH /tables/:id` | renumber table | | | ✓ |
| `DELETE /tables/:id` | remove table (refused while it has orders) | | | ✓ |
| `GET /items` / `GET /ingredients` | menu / stock listings | ✓ | | ✓ |
| `POST /items` | create menu item | | | ✓ |
| `PATCH /items/:id` | update item (name, description, price, preparation flag, ingredient links replaced wholesale — category stays fixed at creation) | | | ✓ |
| `DELETE /items/:id` | remove item from menu | | | ✓ |
| `POST /ingredients` | register ingredient | | | ✓ |
| `PATCH /ingredients/:id` | rename ingredient | | | ✓ |
| `PATCH /ingredients/:id/stock` | mark ingredient available/unavailable | | | ✓ |
| `DELETE /ingredients/:id` | remove ingredient | | | ✓ |

Error conventions: business refusals return `400` with the spec message (`{"message": "Cannot cancel an item in preparation"}`); missing/invalid tokens return `401`; role denials return `403` with `"Access not authorized for your profile"` (or the specific message, e.g. `"Only the manager can close the order"`).

## Architecture

Modular monolith with bounded contexts under `src/` (`orders`, `kitchen`, `catalog`, `tables`, `users`), each in domain → application → presentation layers with repository interfaces in `domain/repositories/` and Prisma implementations in `infrastructure/`. Feature specs live in `features/*.feature`; capability specs (normative system behavior) live in `openspec/specs/`. Domain rules are pure TypeScript with unit tests; e2e tests map to feature scenarios.

## Known gaps

- `JWT_SECRET` ships with a development placeholder in `.env.local` — change it for any real deployment.
- `supertest` is pinned to `7.1.4` (7.2.x removed the `.set()` method used by the e2e specs).
