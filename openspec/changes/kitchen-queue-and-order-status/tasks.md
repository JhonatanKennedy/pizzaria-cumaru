## 1. Prerequisites

- [ ] 1.1 Verify change `translate-features-to-english` is applied: `features/` contains the English filenames (03_table_order, 06_cook_profile, 09_cancellation_and_payment, ...) and no pt-br keywords remain

## 2. Domain — orders aggregate

- [ ] 2.1 Replace `OrderItems.changeStatus()` with `startPreparation()`, `finishPreparation()`, and `cancel(reason)` per D1, add `requiresPreparation` and optional `status` per D2, and add `createdAt` to the create params per D4; verify the colocated `order-items.spec.ts` unit tests cover every valid transition and every invalid one (thrown messages per D1)
- [ ] 2.2 Add `createdAt` to `Order` (D4), add `cancelItem(itemId, reason)` with the cancellation-history construct (D3), and add the read getters the queue needs (items, status, type, createdAt); verify `orders.spec.ts` unit tests cover cancellation removal, history recording, closed-order refusal, and reason required
- [ ] 2.3 Run `npm test` and verify all domain specs pass in milliseconds with no I/O

## 3. Persistence — Prisma

- [ ] 3.1 Extend `src/prisma/schema.prisma` with `Order`, `OrderItem`, `Item`, `Ingredient` models and the `Item`↔`Ingredient` relation per D6, run `npx prisma generate`, and verify the generated client compiles
- [ ] 3.2 Run `npx prisma migrate dev` to create the first migration and verify `migrations/` contains the generated SQL
- [ ] 3.3 Implement the orders repository and catalog repository (interfaces from `domain/repositories/`) with mappers between aggregates and rows, and verify integration tests against the test database cover load/save round-trips including optional status and cancellation history

## 4. Application — commands in orders

- [ ] 4.1 Implement `start-item-preparation` use-case (load order, `startPreparation()`, save) and wire `PATCH /orders/:orderId/items/:itemId/status` with `{ status: "Preparing" }`; verify a unit test with a fake repository covers the happy path and the invalid-transition error
- [ ] 4.2 Move `finish-item-preparation` from `kitchen/application` to `orders/application`, implement it (Preparing → Ready, order stays open), wire the same PATCH route with `{ status: "Ready" }`, and delete the kitchen stub; verify unit tests cover happy path and invalid transition
- [ ] 4.3 Implement `cancel-item-from-order` (reason required, removal + history) and wire `POST /orders/:orderId/items/:itemId/cancellation`; verify unit tests cover prepared-vs-non-prepared and closed-order refusal

## 5. Kitchen — read-only projection

- [ ] 5.1 Implement `list-kitchen-queue` in `kitchen/application` as the projection of orders + catalog per the kitchen spec (two queues, arrival ordering, preparation-only, stock hiding, Preparing badge), expose `GET /kitchen/queue` from a kitchen controller, and wire `KitchenModule` in `app.module.ts`; verify unit tests with fake repositories cover queue splitting, ordering, filtering, and badge output
- [ ] 5.2 Add e2e coverage for `PATCH .../status` and `GET /kitchen/queue` against seeded rows and verify `npm run test:e2e` passes

## 6. Cleanup

- [ ] 6.1 Delete `src/restaurant/` and verify `npm run build` passes
- [ ] 6.2 Rename `src/catalog/domain/entities/ingridients.ts` to `ingredients.ts`, update imports, and verify `npm run build` and `npm test` pass

## 7. Specs and final verification

- [ ] 7.1 Update the translated `features/06_cook_profile.feature` so the confirm-finished scenarios include the start-preparation step in the Given (D8), and verify scenario count and semantics are unchanged otherwise
- [ ] 7.2 Run `npm run format`, `npm run lint`, `npm test`, and `npm run test:e2e` and verify all pass
