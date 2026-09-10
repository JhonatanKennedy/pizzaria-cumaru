# JavaScript good practices

These are language-level rules that apply to every `.ts` file in the project. Examples use real project types and, where noted, real code.

## 1. No magic numbers

A literal whose meaning isn't obvious from context goes into a named `const` or an enum — the name documents the _why_. `OrderItems.decreaseQuantity` (order-items.ts) is the model: the business minimum lives in a named constant at the top of the file, while the inline literal version is the anti-pattern:

```ts
// ❌ — what does < 1 mean here? A business minimum, not an index.
decreaseQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  if (this.quantity - quantity < 1) {
    throw new Error('Quantity cannot be less than one');
  }
  this.quantity -= quantity;
}

// ✅ — the constant says what 1 stands for (order-items.ts, as-is)
const MINIMUM_ITEM_QUANTITY = 1;

decreaseQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  if (this.quantity - quantity < MINIMUM_ITEM_QUANTITY) {
    throw new Error('Quantity cannot be less than one');
  }
  this.quantity -= quantity;
}
```

Applies to time math too: `24 * 60 * 60 * 1000` becomes `const MS_PER_DAY = 24 * 60 * 60 * 1000;`. The rule targets literals with business meaning — trivial `0`/`1` as indexes or loop bounds are fine. (`User` also does this: `MAX_FAILED_ATTEMPTS = 5`, `LOCKOUT_MS = 15 * 60 * 1000`.)

Applies to time math too: `24 * 60 * 60 * 1000` becomes `const MS_PER_DAY = 24 * 60 * 60 * 1000;`. The rule targets literals with business meaning — trivial `0`/`1` as indexes or loop bounds are fine.

## 2. No nested ternaries

At most one `?:` per expression. Anything more becomes `if`/`else` or a named helper.

```ts
// ❌ — two levels of ?: force the reader to re-scan
const label =
  order.status === EOrderStatus.CLOSED
    ? 'Fechado'
    : order.type === EOrderType.LOCAL
      ? 'Na mesa'
      : 'Delivery';

// ✅ — early returns, one branch per line
function getOrderLabel(order: Order): string {
  if (order.status === EOrderStatus.CLOSED) return 'Fechado';
  if (order.type === EOrderType.LOCAL) return 'Na mesa';
  return 'Delivery';
}
```

## 3. `const` by default; `let` only when reassigned; never `var`

```ts
// ❌
var total = 0;
let item = OrderItems.create({ ... }); // never reassigned

// ✅
const item = OrderItems.create({ ... });
let total = 0; // reassigned below, so let is correct
```

## 4. Early returns over deep nesting

Guard clauses keep the happy path at the left margin. The real `Order.addItem` is the model:

```ts
// ❌ — arrow code, the real logic sits 3 levels deep
addItem(item: OrderItems): void {
  if (this.status !== EOrderStatus.CLOSED) {
    if (item.getQuantity() > 0) {
      this.items.push(item);
    }
  }
}

// ✅ — one guard, then the happy path
addItem(item: OrderItems): void {
  if (this.status === EOrderStatus.CLOSED) {
    throw new Error('Cannot change a closed order');
  }
  this.items.push(item);
}
```

## 5. Strict equality always

`===` and `!==` — never `==`/`!=`.

```ts
// ❌
if (order.status == EOrderStatus.CLOSED) { ... }

// ✅
if (order.status === EOrderStatus.CLOSED) { ... }
```

## 6. Nullish coalescing and optional chaining

Defaults via `??`, optional access via `?.` — not hand-rolled ternary checks.

```ts
// ❌
const notes = order.notes !== undefined ? order.notes : '';
const tableNumber = order.table ? order.table.number : undefined;

// ✅
const notes = order.notes ?? '';
const tableNumber = order.table?.number;
```

## 7. Data transforms via `map`/`filter`/`reduce`, not manual loops

The real `Order.totalPrice` getter is the model:

```ts
// ✅ — declarative, no index juggling (orders.ts, as-is)
get totalPrice(): number {
  return this.items.reduce((total, item) => total + item.totalPrice, 0);
}

// ❌ — manual loop restating what reduce expresses
get totalPrice(): number {
  let total = 0;
  for (let i = 0; i < this.items.length; i += 1) {
    total += this.items[i].totalPrice;
  }
  return total;
}
```

## 8. Boolean-returning methods read as questions

`isAvailable()` / `isClosed()` — not `getInStock()` / `getClosed()`. The real `Ingredient` does this:

```ts
// ❌
getInStock(): boolean {
  return this.inStock;
}

// ✅ — reads naturally in an if (ingredient.ts, as-is)
isAvailable(): boolean {
  return this.inStock;
}
```

## 9. No boolean-trap parameters

A bare `true`/`false` at a call site is a magic value. Prefer dedicated methods (or an options object). `Ingredient` gets it right with two explicit methods instead of `setInStock(bool)`:

```ts
// ❌ — what does false mean here?
ingredient.setInStock(false);

// ✅ — self-documenting
ingredient.markOutOfStock();
ingredient.markInStock();
```

## 10. No assignments or side effects inside conditions

```ts
// ❌ — assignment hidden in the condition
if ((item = order.findItem(itemId))) { ... }

// ✅
const item = order.findItem(itemId);
if (item) { ... }
```
