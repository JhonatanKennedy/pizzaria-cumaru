## 1. Shared in-progress predicate (apps/api)

- [x] 1.1 Add `private openOrderConditions(): Prisma.OrderWhereInput[]` to `src/orders/infrastructure/prisma-orders-repository.ts`, beside the existing `completedWhere`, returning the local-`Open` and delivery-cycle conditions currently inlined in `findAllOpen`. Verify by reading `findAllOpen` — it must no longer carry the status literals itself.
- [x] 1.2 Point `findAllOpen` at the new builder and confirm the kitchen queue and floor view behave identically. Verify with the existing `findAllOpen` cases in `prisma-orders-repository.spec.ts` (the in-cycle delivery and open-only cases around :135–:185) passing unchanged.

## 2. Widen the listing (apps/api)

- [x] 2.1 Change `findAllForListing` to `where: { OR: [ { createdAt: { gte: start, lt: end } }, ...this.openOrderConditions() ] }`, spreading the builder so no `OR` nests inside another. Verify with `npm test -w apps/api` and the new cases in 3.
- [x] 2.2 Correct the now-false doc comment on `ListOrdersUseCase` (`src/orders/application/use-cases/list-orders.ts`), which claims the listing is the day's orders. Verify by reading it against the new `where`: it must describe the union.

## 3. Regression coverage (apps/api)

- [x] 3.1 Add cases to `prisma-orders-repository.spec.ts` beside the existing `findAllForListing` cases (~:300) covering the widened set: a local order created on the previous day while still "Open" is listed; a delivery order created on the previous day at "Preparing" and at "Out for delivery" is listed. Verify with `npm test -w apps/api`.
- [x] 3.2 Add the exclusion cases to the same file: an order created on the previous day at "Closed", and at "Delivered", are **not** listed; and orders created on the requested day are listed whatever their status. Verify with `npm test -w apps/api`.
- [x] 3.3 Add a guard case asserting `findDaySales` still returns only the day's completed orders, so a later widening cannot silently pull the reports along. Verify with `npm test -w apps/api`.

## 4. Product spec (shared)

- [x] 4.1 Check whether `features/03_table_order.feature` or `features/10_table_management.feature` states the listing's scope, and add a scenario for an order left open overnight only if one of them owns that behaviour. Verify by grepping both files for the listing; if neither owns it, record the decision to leave the Gherkin untouched in the change rather than inventing a home for it. → Neither owns it (10's hits are all the *table* listing; 03 never mentions it). Recorded as decision 6 in `design.md`.

## 5. Verification

- [x] 5.1 Run the api suite and confirm it passes with the new cases on top of the current 244. → 249 passed (30 files), i.e. 244 + the 5 new cases.
- [x] 5.2 Run the web suite and confirm it still passes at 279 — this change touches no web code, so any movement is a signal that the listing's consumers were relying on the old scope. → 279 passed (56 files), unmoved. No web consumer depended on the old scope.
- [x] 5.3 Run `npm run lint` and `npm run format` from the root and confirm both are clean. → `lint` is clean. `format` is **not** clean, for reasons outside this change: with no `.prettierignore` anywhere, `apps/api`'s `prettier --write "src/**/*.ts"` sweep rewrites the committed generated client (`src/prisma/generated/**`, 17 files, +10794/−7285) plus two hand-written files (`add-item-to-order.ts`, `list-kitchen-queue.ts`) that were never prettier-clean under the pinned 3.9.6. That churn was reverted; the three files this change touches were verified prettier-clean individually. Recorded as a repo-wide gap, not fixed here — see the note in `design.md`.
- [x] 5.4 Run `openspec validate fix-orders-listing-scope --strict` and confirm the change validates.
- [x] 5.5 Land it as one commit in `apps/api`, separate from the Ready-item quantity fix. Verify with `git show --stat`. → `fix: scope the orders listing to the day plus still-open orders` (8 files, +357/−13): the three `apps/api` files plus this change's five artifacts. On branch `fix/orders-listing-scope`, branched off `master` rather than committed to it directly. The `fix-ready-item-quantity` artifacts are left untracked, so the two changes stay separable.
