## 1. Prerequisites

- [x] 1.1 Verify `translate-features-to-english` is applied (`features/01_authentication.feature`, `05_waiter_profile.feature`, `06_cook_profile.feature`, `07_manager_profile.feature` exist in English) and `kitchen-queue-and-order-status` is applied (item-status PATCH and kitchen queue GET endpoints exist)

## 2. Domain — user and role

- [x] 2.1 Create `src/users/domain/enums/user-role.ts` with `EUserRole` per D1 and verify a unit test asserts the three values
- [x] 2.2 Fill `src/users/domain/entities/user.ts` with `id`, `login`, `passwordHash`, `role` and factory validation per D2, and verify `user.spec.ts` unit tests cover invalid login and invalid role rejection

## 3. Auth infrastructure

- [x] 3.1 Install `@nestjs/jwt`, `bcrypt`, and bcrypt dev types, and verify `npm run build` passes
- [x] 3.2 Add `role`, `passwordHash`, `failedAttempts`, `lockedUntil` to the Prisma `User` model, run `npx prisma migrate dev` (second migration), and verify the generated client compiles
- [x] 3.3 Implement the user repository (find by login, save lockout state) with a mapper, and verify integration tests against the test database cover the round-trip
- [x] 3.4 Add a seed script providing the three profile users ("ana.gerente", "joao.garcom", "carlos.cozinha") with hashed passwords, and verify seeding runs and the users are retrievable with their roles

## 4. Authentication use-cases and endpoints

- [x] 4.1 Implement `authenticate-user` (validate credentials, lockout counting per D8, issue JWT with user id and role) with an injected clock, and verify unit tests with a fake repository cover success, wrong password, 4-vs-5 failures, lock window refusal, and reset on success
- [x] 4.2 Implement `logout-user` (denylist the token) and verify a unit test covers that a denied token is refused afterwards
- [x] 4.3 Wire `POST /auth/login` and `POST /auth/logout` controllers and verify e2e specs cover login success returning the role, invalid password refusal with "Invalid username or password", lockout message after 5 failures, and logout followed by refusal

## 5. Authorization guard

- [x] 5.1 Implement the `RolesGuard` + `@Roles` decorator reading the role from the JWT per D5, and verify unit tests cover each role decision and both refusal messages
- [x] 5.2 Apply the guard per the D7 matrix to the item-status PATCH and kitchen queue GET endpoints from `kitchen-queue-and-order-status`, and verify e2e specs cover a Waiter refused on the kitchen queue, a Waiter refused on finishing an item, and a Manager granted on both
- [x] 5.3 Record the D7 matrix as a comment in the guard file so future endpoints declare their roles, and verify the comment is present

## 6. Final verification

- [x] 6.1 Run `npm run format`, `npm run lint`, `npm test`, and `npm run test:e2e` and verify all pass
