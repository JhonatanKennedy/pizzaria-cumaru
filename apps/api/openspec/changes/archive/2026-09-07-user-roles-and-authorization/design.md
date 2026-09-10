## Context

`User` is an empty shell, `authenticate-user`/`logout-user` are stubs, and the Prisma schema's only model (`User`) has no role or credential columns. The translated `01_authentication.feature` defines login, refusal, lockout, logout, and role-based screen access; the profile features (05/06/07) define who may perform each action. Prerequisites: `translate-features-to-english` and `kitchen-queue-and-order-status` applied (the item-status endpoints exist to be guarded).

## Goals / Non-Goals

**Goals:**

- A role carried by the authenticated identity, enforced at the HTTP boundary by a guard.
- Login with lockout and logout per `01_authentication.feature`.
- The permission matrix from the profile features becomes enforceable rules on the endpoints that exist, and documented convention for every future one.

**Non-Goals:**

- User registration/CRUD and password recovery (no feature file describes them). The three profile users are provided as seed data.
- The delivery-order status cycle and any other flow not yet built.

## Decisions

### D1. Role enum

`EUserRole` with `WAITER = 'Waiter'`, `COOK = 'Cook'`, `MANAGER = 'Manager'` — following the domain enum convention (`E` prefix, title-cased values).

### D2. User entity

`User` gets `id`, `login`, `passwordHash`, `role`, with factory validation (login non-empty, role a valid `EUserRole`). The password itself never lives on the entity in plain form.

### D3. Auth mechanism — JWT bearer

Login issues a short-lived JWT bearer token carrying the user id and role. Alternatives considered: server-side sessions — rejected (stateless API, NestJS standard), but logout and lockout still need server state, which is handled as follows: logout records the token in a denylist; requests bearing a denied token are refused. The lockout state (`failedAttempts`, `lockedUntil`) lives on the `User` row. Time reads go through an injected clock so lockout tests stay repeatable.

### D4. Password hashing

bcrypt for password hashing and verification. New dependencies: `@nestjs/jwt`, `bcrypt` (+ dev types). Passwords are never logged.

### D5. Boundary guard

A `RolesGuard` plus a `@Roles(...)` decorator: the guard reads the role from the JWT claim and refuses with the specific message where one exists ("Only the manager can close the order") and with "Access not authorized for your profile" otherwise. Applied at the controller level, not inside use-cases — authorization is a boundary concern.

### D6. Persistence

Prisma `User` gains `role`, `passwordHash`, `failedAttempts`, `lockedUntil`. Migration runs after the one from `kitchen-queue-and-order-status`. A seed provides the three profile users ("ana.gerente", "joao.garcom", "carlos.cozinha") for dev and e2e.

### D7. Permission matrix (from the translated features)

| Action | Waiter | Cook | Manager |
| --- | --- | --- | --- |
| Create local/delivery order, add items | yes | no | yes |
| Start / finish item preparation | no | yes | yes |
| Cancel item | yes | no | yes |
| Close order | no | no | yes — message "Only the manager can close the order" |
| Daily earnings report | no | no | yes |
| Kitchen queue | no | yes | yes |
| Ingredient consultation | yes | no | yes |

### D8. Lockout mechanics

5 consecutive failures → `lockedUntil = now + 15 minutes`, message "Account locked. Try again in 15 minutes". Successful login resets `failedAttempts`. Attempts during the lock window are refused without checking the password.

### D9. Login response and "redirect"

The backend returns the authenticated identity with its role; routing to the role's panel is a frontend concern and not modeled here.

## Risks / Trade-offs

- [JWT denylist grows unbounded] → Short token expiry plus cleanup of expired denylist entries on read.
- [Matrix drift as endpoints multiply] → The matrix (D7) is documented in this design and mirrored in the authorization spec; every new endpoint in future changes must state its roles.
- [Lockout boundary conditions] → Clock injected; unit tests cover attempt 4 vs 5, expiry of the window, and reset on success.
- [bcrypt native dependency] → Standard choice; if the environment forbids native builds, `argon2` is the drop-in alternative considered.

## Open Questions

None — all decisions locked or flagged above.
