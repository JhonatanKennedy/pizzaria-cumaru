## Why

The profiles exist only in the product specs: users log in as "Garçom", "Cozinheiro", or "Gerente", each profile can touch only its own screens, and unauthorized access must be refused. The backend has no concept of roles — the `User` entity is an empty shell, the auth use-cases are stubs, and nothing enforces who may start a preparation, close an order, or view the earnings report. Without roles, the endpoints built by other changes (kitchen queue, item status) have no one guarding them.

## What Changes

- **Role model** — `EUserRole` enum (`Waiter`, `Cook`, `Manager`) and a real `User` entity carrying the role; the Prisma `User` model gains the columns the auth flows need (role, password hash, lockout state).
- **Authentication** — implement `authenticate-user`: login with username/password returns the authenticated identity with its role; invalid credentials are refused with "Invalid username or password"; 5 consecutive failures block the account temporarily with "Account locked. Try again in 15 minutes"; successful login resets the failure count. Implement `logout-user`: logout ends the session.
- **Authorization** — a boundary guard enforcing the permission matrix from the (translated) feature files: only Manager closes orders and sees the earnings report; Cook or Manager start and finish item preparation; Waiter or Manager cancel items; Cook or Manager see the kitchen queue; the Cook profile gets no ingredient consultation. Unauthorized access is refused with "Access not authorized for your profile".
- **Persistence** — `User` repository implementation backed by Prisma (second migration, after the one from `kitchen-queue-and-order-status`).
- **Wiring** — guards applied to the endpoints that exist by then (item-status PATCH, kitchen queue GET) and documented as the pattern for every future endpoint.

## Capabilities

### New Capabilities

- `users/authentication`: login with credentials, invalid-credential refusal, lockout after repeated failures, logout, and the authenticated identity carrying a role.
- `authorization/permissions`: the role-based access rules for every action, with refusal behavior.

### Modified Capabilities

None — `openspec/specs/` only gains these two.

## Impact

- `src/users/domain` — `EUserRole` enum, `User` entity with validation.
- `src/users/application` — `authenticate-user` and `logout-user` implemented.
- `src/users/presentation` — `POST /auth/login`, `POST /auth/logout` controllers.
- `src/prisma/schema.prisma` — `User` gains `role`, `passwordHash`, `failedAttempts`, `lockedUntil`; new migration.
- New dependencies: `@nestjs/jwt`, `bcrypt` (or equivalent) — see design.md.
- `src/orders/...`, `src/kitchen/...` — existing endpoints from `kitchen-queue-and-order-status` receive guards; no behavioral change to those flows.
- **Prerequisites**: `translate-features-to-english` (English specs) and `kitchen-queue-and-order-status` (endpoints to guard) applied first.

**Out of scope**: password reset/recovery flows, user registration/CRUD, and the delivery-order status cycle (no feature file describes any of these).
