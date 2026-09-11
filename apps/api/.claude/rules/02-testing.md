# Testing rules

Tests follow the **test pyramid** and the **F.I.R.S. principles** (Timely deliberately excluded). Both are enforced in review.

## The test pyramid

Two layers, and everything below `test/` is in the first one:

| Layer                          | Where it lives        | Run with           | Share of test code |
| ------------------------------ | --------------------- | ------------------ | ------------------ |
| Unit — entities, use-cases, adapters | colocated `*.spec.ts` | `npm test`     | ~90%               |
| E2E — full HTTP flows          | `test/*.e2e-spec.ts`  | `npm run test:e2e` | ~10%               |

`npm test` opens no connection — not to Postgres, not to anything. It needs no Docker, no `.env.local` and no `DATABASE_URL`, and a spec that breaks that is a bug in the spec. The adapter specs are unit tests by that measure even though they sit in `infrastructure/`: they build their repository over a hand-rolled `PrismaService` double and assert what it maps and what it asks for, which is what makes a repository's translation testable at all. What no unit test can prove is that Postgres honours the `where` a repository builds — that is e2e's job, and the reason `test/` still exists.

Rule of thumb: **every business rule gets a unit test; e2e covers only complete user journeys**, not edge cases. A closed-order rejection is a unit test on `Order` — not a 400-assertion over HTTP.

```ts
// ❌ business rule tested through HTTP: slow, needs a DB, brittle
it('should reject items on a closed order', async () => {
  await request(app.getHttpServer())
    .post('/orders/order-1/items')
    .send({ itemId: 'x', quantity: 1 })
    .expect(400);
});

// ✅ the same rule as a unit test on the aggregate — milliseconds, no I/O
it('should throw when adding an item to a closed order', () => {
  const order = makeOrder();
  order.addItem(makeItem(PIZZA_PRICE));
  order.close(EPaymentType.CASH, CLOSED_AT);

  expect(() => order.addItem(makeItem(WATER_PRICE))).toThrow(
    'Cannot change a closed order',
  );
});
```

## F.I.R.S. — four of the five

F.I.R.S.T stands for Fast, Independent, Repeatable, Self-validating, Timely. We follow the first four. **Timely is intentionally dropped**: tests do not have to be written before the code (no TDD requirement) — they may come with or right after the implementation, as long as business rules end up covered.

### Fast

Unit tests must run in milliseconds — no database, no network, no file I/O. Anything that opens a PostgreSQL connection is not a unit test.

```ts
// ❌ opens a real DB connection — not a unit test
it('should save a user', async () => {
  const prisma = new PrismaService();
  const saved = await prisma.user.create({
    data: { email: 'clerk@pizzaria.com' },
  });
  expect(saved.id).toBeDefined();
});

// ✅ pure domain logic — no I/O at all
it('should start OPEN with a total of zero', () => {
  const order = makeOrder();
  expect(order.totalPrice).toBe(0);
});
```

Real persistence belongs in `test/`, against the dedicated test database `vitest.config.e2e.ts` wires up. When a repository needs a Prisma call in a unit spec, double `PrismaService` — `new PrismaOrdersRepository(double as unknown as PrismaService)`, where the double is a `vi.fn()` per method typed by the generated `Prisma.*Args` — and assert both the aggregate the adapter built and the `where` it asked for.

### Independent

A test's result depends on the code under test and on nothing else — not on another test, not on the order the suite runs in, not on what happened to run before it in the same file. Every test passes **alone, in any subset, in any order**. This is the one of the five that a green suite hides completely: a coupled suite is green in the order it was written, and red the moment someone reaches for `it.only`, a shuffle, or a narrower subset.

**"Shares nothing" covers infrastructure, not only fixtures.** An in-process `makeOrder()` is the easy half. The half that gets forgotten is external state — one database a previous spec truncated, one server a previous spec booted, a file, the system clock. If two tests can reach the same row, port or file, they are coupled however clean their fixtures look.

```ts
// ❌ — green, and only in this order
let sharedOrder: Order;

it('adds the first item', () => {
  sharedOrder = makeOrder();
  sharedOrder.addItem(makeItem(PIZZA_PRICE));
  expect(sharedOrder.totalPrice).toBe(PIZZA_PRICE);
});

it('adds a second item', () => {
  sharedOrder.addItem(makeItem(WATER_PRICE)); // fails if run alone
  expect(sharedOrder.totalPrice).toBe(PIZZA_PRICE + WATER_PRICE);
});

// ✅ — a fresh order per test, from a factory called inside each it
it('adds a second item', () => {
  const order = makeOrder();
  order.addItem(makeItem(PIZZA_PRICE));
  order.addItem(makeItem(WATER_PRICE));
  expect(order.totalPrice).toBe(PIZZA_PRICE + WATER_PRICE);
});
```

The external-state half looks like this — and note it is the same bug, one level down:

```ts
// ❌ — the second test only passes because the first one ran
let token = '';

it('logs the manager in', async () => {
  token = await loginAs('ana.gerente');
});

it('closes the order', async () => {
  await closeOrder(token);
});

// ✅ — each test earns what it needs
it('closes the order', async () => {
  const token = await loginAs('ana.gerente');
  await closeOrder(token);
});
```

**The loudest smell is runner configuration.** `fileParallelism: false`, a `--sequence` flag, or a comment naming the spec that has to run first are all the same finding: the tests are coupled and the runner has been asked to hide it. Fix the tests.

**No exceptions.** A spec that shares a database, a server or a file with another spec is not independent, however carefully it truncates between tests. There is no carve-out for the e2e layer — sharing infrastructure *is* the violation, not a permitted cost of it. The api's `test/` specs break this rule today; that is recorded as open debt in [08-conventions.md](08-conventions.md#7-known-debt--open-questions), not as an exemption here.

### Repeatable

Same result on every run: no real clock, no randomness, no shared external state. Where a rule involves time, the time is a parameter — and in this codebase it already is: every aggregate takes its timestamps from outside rather than reading `Date.now()`.

```ts
// ❌ — the aggregate reads the clock, so the assertion depends on when it runs
close(paymentType: EPaymentType): void {
  this.closedAt = new Date();
}

// ✅ — the caller supplies the instant (orders.ts, as-is)
close(paymentType: EPaymentType, closedAt: Date): void {
  this.closedAt = closedAt;
}
```

The spec then pins them, which is why the fixtures at the bottom of this file declare `CREATED_AT` and `CLOSED_AT` as constants instead of calling `new Date()`.

`Order.create` / `OrderItems.create` take `createdAt` for the same reason — and it is enforced by the type, so there is no way to accidentally fall back to the real clock.

### Self-validating

Assertions decide pass/fail — never `console.log` for a human to verify.

```ts
// ❌ requires a human to read the output
it('closes the order', () => {
  const order = makeOrder();
  order.addItem(makeItem());
  order.close(EPaymentType.CASH, CLOSED_AT);
  console.log(order); // "looks right" is not a test
});

// ✅ asserts the observable outcome
it('closes the order', () => {
  const order = makeOrder();
  order.addItem(makeItem());
  order.close(EPaymentType.CASH, CLOSED_AT);
  expect(() => order.addItem(makeItem())).toThrow(
    'Cannot change a closed order',
  );
});
```

### Timely — intentionally not required

The "T" is dropped from our F.I.R.S. on purpose: writing the test first (TDD) is allowed but not mandated. What is mandated: when a feature ships, its business rules have tests.

## Layout & tooling

- Unit tests: colocated `*.spec.ts` next to the code under test. E2E: `test/*.e2e-spec.ts` (8 today — `auth`, `catalog-management`, `cors`, `delivery-order-status`, `order-creation`, `orders-checkout`, `order-status`, `tables`).
- **The two e2e suites coexist but must never overlap.** This one resets `TEST_DATABASE_URL`; the SPA's browser suite (`apps/web/cypress/e2e/`, run by `npm run test:e2e` at the repo root) resets the *same* database. `npm run test:e2e -w apps/api` goes through `scripts/e2e-lock.mjs`, which takes a PID lockfile (`apps/api/.e2e.lock`, stale-PID aware) and refuses to start with a clear message while the other run holds it. Don't remove the lock to make a run start — wait, or stop the other one.
- Vitest `globals: true` — never import `describe`, `it`, `expect`.
- E2E specs map to feature files: `test/auth.e2e-spec.ts` implements scenarios from the repo-root `features/01_authentication.feature`, `test/order-creation.e2e-spec.ts` and `test/orders-checkout.e2e-spec.ts` cover the repo-root `features/03_table_order.feature` / `09_cancellation_and_payment.feature`. If you can't name the scenario it covers, the test doesn't belong in e2e.

## Naming

`describe('<Class | use-case>')` → `it('should <observable behavior>')` — English, present tense, behavior not implementation:

```ts
describe('OrderItems', () => {
  it('should reject a quantity of zero', () => { ... });
  it('should throw when decreasing below the minimum quantity', () => { ... });
  it('should calculate totalPrice as unitPrice times quantity', () => { ... });
});
```

## Full example — unit spec for the Order aggregate

`src/orders/domain/entities/orders.spec.ts` is the reference; the shape of it is what matters here.

```ts
const PIZZA_PRICE = 45;
const WATER_PRICE = 8;
const CREATED_AT = new Date('2026-09-07T12:00:00Z');
const CLOSED_AT = new Date('2026-09-07T12:30:00Z');

function makeOrder(): Order {
  return Order.create({
    id: ORDER_ID,
    userId: USER_ID,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.CASH,
    createdAt: CREATED_AT,
  });
}

function makeItem(unitPrice: number, quantity = 1): OrderItems {
  return OrderItems.create({
    id: `item-${unitPrice}`,
    orderId: ORDER_ID,
    itemId: CATALOG_ITEM_ID,
    unitPrice,
    quantity,
    requiresPreparation: true,
    createdAt: CREATED_AT,
  });
}

describe('Order', () => {
  it('should start OPEN with a total of zero', () => {
    const order = makeOrder();

    expect(order.getStatus()).toBe(EOrderStatus.OPEN);
    expect(order.totalPrice).toBe(0);
  });

  it('should throw when adding an item to a closed order', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));
    order.close(EPaymentType.CASH, CLOSED_AT);

    expect(() => order.addItem(makeItem(WATER_PRICE))).toThrow(
      'Cannot change a closed order',
    );
  });
});
```

Named constants (see the [no-magic-numbers rule](03-javascript.md#1-no-magic-numbers)), a fixed clock (see Repeatable above), and only the public API (`create`, `close`, `addItem`, `totalPrice`, getters) — never private fields. `Order.create` and `OrderItems.create` both require `createdAt`, and item creation requires `requiresPreparation`.
