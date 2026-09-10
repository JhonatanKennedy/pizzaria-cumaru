# Testing rules

Tests follow the **test pyramid** and the **F.I.R.S. principles** (Timely deliberately excluded). Both are enforced in review.

## The test pyramid

More unit tests than integration tests, more integration tests than e2e tests. Target split:

| Layer                                             | Where it lives        | Run with           | Share of test code |
| ------------------------------------------------- | --------------------- | ------------------ | ------------------ |
| Unit — domain entities, use-cases                 | colocated `*.spec.ts` | `npm test`         | ~70%               |
| Integration — repositories, Prisma, module wiring | colocated `*.spec.ts` | `npm test`         | ~20%               |
| E2E — full HTTP flows                             | `test/*.e2e-spec.ts`  | `npm run test:e2e` | ~10%               |

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

Real persistence belongs in integration tests, against a dedicated test database.

### Independent

Each test builds its own fixtures and shares nothing. Tests must pass in any order, in any subset, alone (`it.only`).

```ts
// ❌ module-level state mutated across tests — order-dependent
let sharedOrder: Order;

describe('Order', () => {
  it('adds the first item', () => {
    sharedOrder = makeOrder();
    sharedOrder.addItem(makeItem(PIZZA_PRICE));
    expect(sharedOrder.totalPrice).toBe(PIZZA_PRICE);
  });

  it('adds a second item', () => {
    sharedOrder.addItem(makeItem(WATER_PRICE)); // fails if run alone
    expect(sharedOrder.totalPrice).toBe(PIZZA_PRICE + WATER_PRICE);
  });
});

// ✅ a fresh order per test (factory helper called in each it)
describe('Order', () => {
  it('adds the first item', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));
    expect(order.totalPrice).toBe(PIZZA_PRICE);
  });

  it('adds a second item', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));
    order.addItem(makeItem(WATER_PRICE));
    expect(order.totalPrice).toBe(PIZZA_PRICE + WATER_PRICE);
  });
});
```

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

- Unit/integration tests: colocated `*.spec.ts` next to the code under test. E2E: `test/*.e2e-spec.ts` (7 today — `auth`, `catalog-management`, `delivery-order-status`, `order-creation`, `orders-checkout`, `order-status`, `tables`).
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
