## 1. Domain guard (apps/api)

- [x] 1.1 In `src/orders/domain/entities/order-items.ts`, make `increaseQuantity` refuse when `this.status === EOrderItemStatus.READY`, throwing `'Cannot change a ready item'` before the existing `quantity <= 0` check. Verify with new cases in `order-items.spec.ts`: a `Ready` item throws on increase, and a `Pending` item still increases. → 6 new cases (Pending, Preparing, non-prepared increase; Ready refused; quantity held on refusal; Ready still decreases). `order-items.spec.ts`: 26 passed.
- [x] 1.2 Correct the now-false doc comment on `UpdateOrderItemQuantityUseCase` (`update-order-item-quantity.ts`) — it currently claims "whatever the item's preparation status — the kitchen reads live order items". Verify by reading it against the guard: it must describe the `Ready` bound rather than deny it.

## 2. Use-case coverage (apps/api)

- [x] 2.1 Add cases to `update-order-item-quantity.spec.ts` covering the three branches: increasing a `Ready` item throws, increasing a `Pending`/`Preparing` item still succeeds, and **decreasing** a `Ready` item still succeeds (the last is the over-refusal guard). Verify with `npm test -w apps/api`. → 3 new cases; `update-order-item-quantity.spec.ts`: 11 passed.

## 3. Product spec (shared)

- [x] 3.1 Add a scenario to `features/03_table_order.feature` for a finished item — the file covers a non-kitchen item and an item in preparation, and is silent on `Ready`. Verify the new scenario's wording matches `openspec/changes/fix-ready-item-quantity/specs/waiter-table-orders/spec.md`. → "It is not possible to increase an item the kitchen has finished", placed after its in-preparation sibling, matching the delta's "Increasing an item the kitchen has finished" (increase unavailable, decrease still available). The delta's second new scenario, the backend refusal, is a domain rule rather than a product flow, so it is asserted in the use-case spec (2.1) instead of gaining a second Gherkin scenario the task did not ask for.

## 4. SPA gate (apps/web)

- [x] 4.1 Add `src/pages/waiter/business/can-increase-item-quantity.ts` as a pure predicate beside `can-cancel-order-item.ts`, with its spec. Verify with unit cases over each item status — `Ready` false, `Pending`/`Preparing`/`null` true. → 3 passed.
- [x] 4.2 Apply the rule in `src/pages/waiter/pages/order-detail.tsx` so the increase step is not offered on a `Ready` row, leaving the decrease step enabled. Verify with a component case in `order-detail.spec.tsx` asserting the increase control is disabled on a `Ready` item and present on a `Pending` one. → `QuantityStepper` gained an optional `canIncrease` prop, symmetric with its internal `atMinimum` gate on the decrease; the order detail passes `canIncreaseItemQuantity(item.status)`. Two component cases added, plus one case in `quantity-stepper.spec.tsx` for the prop.
- [x] 4.3 Confirm the add-item panel stays reachable on the same screen, so the waiter's path to a further portion is intact. Verify with a component case asserting the panel renders alongside a `Ready` row. → asserts the "Adicionar item" heading is present beside a `Ready` row.

## 5. Verification

- [x] 5.1 Run the api suite and confirm it passes with the new cases on top of the current 244. → 258 passed (30 files). The 244 baseline predates the listing fix, which took it to 249; this change adds the 9 on top.
- [x] 5.2 Run the web suite and confirm it passes with the new cases on top of the current 279. → 286 passed (57 files), i.e. +7: 3 on the new predicate, 3 on the order detail, 1 on the stepper.
- [x] 5.3 Run `npm run lint` and `npm run format` from the root and confirm both are clean. → `lint` is clean. `format` is not clean repo-wide, for the pre-existing reason recorded in the listing change's `design.md` (no `.prettierignore`, so the formatter sweeps the committed generated Prisma client and rewrites it). The same 19-file churn was reverted again; it did not touch any file this change edits. Every file this change touches was verified prettier-clean by path with `npx prettier --check`.
- [x] 5.4 Run `openspec validate fix-ready-item-quantity --strict` and confirm the change validates.
- [x] 5.5 Land the work as one commit spanning both apps — the API guard alone would leave the waiter a button that errors with no hint, and the web gate alone would leave the API open. Verify with `git show --stat`. → `fix: refuse to increase an item the kitchen has finished` (16 files, +410/−3): the four `apps/api` files, the six `apps/web` files, `features/03_table_order.feature` and this change's five artifacts, in one commit on branch `fix/orders-listing-scope`, as the task requires. The tracked `apps/api/tsconfig.build.tsbuildinfo` is deliberately left unstaged.
