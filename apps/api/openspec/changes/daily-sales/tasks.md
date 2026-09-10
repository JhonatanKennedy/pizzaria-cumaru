## 1. Repository read

- [x] 1.1 Extract the completed-window predicate from `findCompleted` into a private `completedWhere(start, end)` helper and add `findDaySales(day)` to `PrismaOrdersRepository` (interface + implementation): the same completed window with `orderBy: { createdAt: 'asc' }`, items included, and waiter names attached as `findAllForListing` does. Verify: new cases in `prisma-orders-repository.spec.ts` assert closed locals and delivered deliveries come back with their waiter name, open / preparing / out-for-delivery / cancelled rows never appear, and the window honors `closedAt` / `deliveredAt` day boundaries; `npm test` green.

## 2. Use case

- [x] 2.1 Create `src/orders/application/use-cases/list-day-sales.ts`, mirroring `list-orders.ts`: maps `IOrderListingEntry[]` to sale rows — the listing shape plus `paymentType`, `closedAt`, `deliveredAt` (null-safe — delivery sales carry no payment type) — with exported interfaces typed like `IOrderListingOrder`. Verify: colocated `list-day-sales.spec.ts` with a fake repository covers the mapping, the delivery `paymentType: null` case, and item passthrough; `npm test` green.

## 3. Controller

- [x] 3.1 Add `GET /reports/daily-sales` to `ReportsController` (`@Roles({ roles: [EUserRole.MANAGER] })`, no query params) and register `ListDaySalesUseCase` in `orders.module.ts`; update the routes table and reports note in `.claude/rules/01-project-context.md`. Verify: `npm run build` passes, the rules doc matches the controller, and the endpoint is covered by the e2e suite in 4.2.

## 4. Feature spec & e2e

- [x] 4.1 Add a "Manager lists the day's sales" scenario to `features/07_manager_profile.feature` tracing the endpoint (completed sales with waiter, payment, sale time; incomplete/cancelled stay out). Verify: scenario wording matches the delta spec requirement.
- [x] 4.2 Extend `test/orders-checkout.e2e-spec.ts` with the day-sales journey: a closed local order and a delivered delivery order appear in `GET /reports/daily-sales` with their waiter name, payment method (delivery without), and sale time, while an open and a cancelled order do not. Verify: `npm run test:e2e` passes.

## 5. Final gate

- [x] 5.1 Run `npx prettier --check src test`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and smoke-check `GET /reports/daily-sales` against the running dev backend as `ana.gerente` (schema-valid rows; a Cook token gets the 403).
