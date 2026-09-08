# TypeScript rules

The compiler is the first reviewer — `strict: true` plus these rules keep types meaningful instead of decorative.

## 1. Never `any`

`any` switches the compiler off exactly where it matters. Use `unknown` + narrowing, or generics.

```ts
// ❌ — any turns off all checking downstream
function parseOrderPayload(body: any): CreateOrderDto {
  return {
    userId: body.userId,
    type: body.type,
    paymentType: body.paymentType,
  };
}

// ✅ — unknown forces validation before use
function parseOrderPayload(body: unknown): CreateOrderDto {
  if (!isCreateOrderBody(body)) {
    throw new Error('Invalid order payload');
  }
  return {
    userId: body.userId,
    type: body.type,
    paymentType: body.paymentType,
  };
}

function isCreateOrderBody(value: unknown): value is CreateOrderDto {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    'userId' in candidate && 'type' in candidate && 'paymentType' in candidate
  );
}
```

## 2. `interface` vs `type`

- **`interface`** — object contracts meant to be implemented or extended (entity param contracts, repository interfaces, DTO shapes).
- **`type`** — what interfaces can't express: unions, tuples, primitive aliases, mapped types.

The codebase already follows this: `CreateOrderItemParams` is an `interface`; `TCreateOrderParams` / `TOrderItemStatus` are type aliases.

```ts
// ✅ interface — the shape of an object to construct
export interface CreateOrderItemParams {
  id: string;
  orderId: string;
  itemId: string;
  unitPrice: number;
  quantity: number;
  requiresPreparation: boolean;
  createdAt: Date;
  flavors?: string[];
  notes?: string;
}

// ✅ type — a union, which interfaces cannot express
export type PaymentResult =
  { ok: true; transactionId: string } | { ok: false; reason: string };
```

**Repo convention:** type aliases are prefixed with `T` (`TCreateOrderParams`, `TOrderItemStatus`, `TRestoreOrderParams`); interfaces keep plain names.

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
