# TypeScript rules

The compiler is the first reviewer — `strict: true` plus these rules keep types meaningful instead of decorative.

## 1. Never `any`

`any` switches the compiler off exactly where it matters. Use `unknown` + narrowing, or generics.

```ts
// ❌ — any turns off all checking downstream: nothing is actually validated
function parseFlavorParts(value: any): TFlavorPart[] {
  return value;
}

// ✅ — unknown forces validation before use (order-mapper.ts, as-is)
function parseFlavorParts(value: unknown): TFlavorPart[] {
  if (!Array.isArray(value) || !value.every(isFlavorPart)) {
    throw new Error('Invalid flavor parts on order item');
  }
  return value;
}

function isFlavorPart(value: unknown): value is TFlavorPart {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.pieces === 'number' &&
    Number.isInteger(candidate.pieces) &&
    candidate.pieces > 0
  );
}
```

That `as Record<string, unknown>` is the one acceptable cast — it follows a `typeof` check, so it narrows rather than lies (see rule 5).

## 2. `interface` vs `type`

- **`interface`** — object contracts meant to be implemented or extended (entity param contracts, repository interfaces, DTO shapes).
- **`type`** — what interfaces can't express: unions, tuples, primitive aliases, mapped types.

```ts
// ✅ interface — a contract for something the caller hands a use-case
// (exactly one per use-case, so use-cases are easy to find and mock)
export interface ICreateOrderParams {
  userId: number;
  type: EOrderType;
  paymentType: EPaymentType;
  createdAt: Date;
}

// ✅ type — the entity factory's input; a shape, not a contract to implement
export type TCreateOrderParams = {
  id: string;
  userId: number;
  type: EOrderType;
  paymentType: EPaymentType;
  createdAt: Date;
};

// ✅ type — a union, which interfaces cannot express
export type TOrderItemStatus = EOrderItemStatus | undefined;
```

**Repo convention — the prefix says which side of the boundary the name lives on:**

| Prefix | Kind      | What it names                                                                                                                                    |
| ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `I`    | interface | Use-case inputs (`ICreateOrderParams`), repository contracts (`IOrdersRepository`), results and listing entries (`IAuthenticateResult`, `IOrderListingOrder`, `IKitchenQueueOrder`) |
| `T`    | type      | Unions and derived aliases (`TOrderItemStatus`, `TFlavorPart`, `TPizzaSize`), row shapes (`TOrderRow`), and the entity factories' param objects (`TCreateOrderParams`, `TCreateItemParams`) |

So `ICreateOrderParams` and `TCreateOrderParams` are not a duplicate pair: the first is what `CreateOrderUseCase` receives, the second what `Order.create` receives.

Two outliers, left alone: `TRestoreOrderParams` is an `interface` despite the `T`, and `CreateOrderItemParams` is an unprefixed `interface` where the table above would say `I`.

## 3. `readonly` everything that must not change

Entities expose state through getters; when a getter returns a collection it returns a readonly view — never the live mutable reference. `Item.getIngredientIds()` already does this:

```ts
// ❌ — caller can mutate internal state
getIngredientIds(): string[] {
  return this.ingredientIds;
}

// ✅
getIngredientIds(): ReadonlyArray<string> {
  return this.ingredientIds;
}
```

Private fields that never change after creation are `readonly` (every entity in the codebase does this).

## 4. Enums over magic strings

Any closed set of domain values is an `E`-prefixed enum (see [domain rules](06-domain.md#4-enums-e-prefix-screaming_snake-members-title-cased-string-values)) — never a bare string literal in logic.

```ts
// ❌ — typos fail silently at runtime
if (item.status === 'Cancelled') { ... }

// ✅
if (item.status === EOrderItemStatus.CANCELLED) { ... }
```

## 5. No unsafe casts

No `as` when a type guard or proper typing does the job. A cast is a promise to the compiler — honor it only after runtime validation, never to silence an error.

```ts
// ❌ — cast lies: payload could be anything at runtime
const dto = payload as CreateOrderDto;

// ✅ — validated before it's typed (see rule 1)
const dto = parseOrderPayload(payload);
```

## 6. Exhaustive `switch` over enums

When switching on an enum, the `default` branch must use `never` — adding an enum member becomes a compile error instead of a silent bug.

```ts
function getOrderTypeLabel(type: EOrderType): string {
  switch (type) {
    case EOrderType.LOCAL:
      return 'Na mesa';
    case EOrderType.DELIVERY:
      return 'Entrega';
    default: {
      const unreachable: never = type;
      throw new Error(`Unhandled order type: ${unreachable}`);
    }
  }
}
```

## 7. No non-null assertions

`!` is a compile-time lie about runtime. Optional fields stay optional; handle absence.

```ts
// ❌ — crashes at runtime when notes is undefined
const notes = order.notes!;

// ✅
const notes = order.notes ?? '';
```

## 8. Explicit return types on public methods

Annotate public method signatures (`static create(...): Order`, `getQuantity(): number`); let inference handle locals and arrow callbacks. Explicit returns make entity APIs self-documenting and catch accidental signature drift.
