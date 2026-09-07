# Domain (DDD) rules

`domain/` is pure TypeScript: no Nest decorators, no Prisma imports, no framework. That's what keeps the unit tests instant (see [02-testing.md](02-testing.md)).

## 1. Private constructor + `static create()` factory

Objects are created only through the factory, which validates and throws `Error` on invalid input. Every current entity (`Order`, `OrderItems`, `Item`, `Ingredient`) follows this:

```ts
export class Order {
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private items: OrderItems[],
    private status: EOrderStatus,
    private type: EOrderType,
    private paymentType: EPaymentType,
    private notes?: string,
  ) {}

  static create(params: TCreateOrderParams): Order {
    return new Order(
      params.id,
      params.userId,
      [],
      EOrderStatus.OPEN,
      params.type,
      params.paymentType,
      params.notes,
    );
  }
}
```

Never `new Order(...)` outside the file. Defaults live in the factory (`params.ingredientIds ?? []` in `Item.create`).

## 2. State changes only through explicit methods

No setters, no public mutable fields. Mutations are domain verbs with invariant checks: `addItem`, `removeItem`, `close`, `rename`, `changePrice`, `linkIngredient`, `markOutOfStock`. Reads happen through getters — collection getters return a readonly view (see [04-typescript.md](04-typescript.md#3-readonly-everything-that-must-not-change)).

## 3. Invariants enforced at every mutation point

The same rule that guards creation guards later mutations — a valid object can never drift into an invalid state. `OrderItems` is the model:

```ts
// ✅ — create and mutate enforce the same invariant (order-items.ts, as-is)
static create(params: CreateOrderItemParams): OrderItems {
  if (params.quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  if (params.unitPrice < 0) {
    throw new Error('Unit price cannot be negative');
  }
  return new OrderItems(/* ... */);
}

decreaseQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  if (this.quantity - quantity < 1) {
    throw new Error('Quantity cannot be less than one');
  }
  this.quantity -= quantity;
}
```

(Note: the `< 1` there is a magic number per [03-javascript.md](03-javascript.md#1-no-magic-numbers) — extract it when touching that code.)

## 4. Enums: `E` prefix, SCREAMING_SNAKE members, title-cased string values

One enum per file in `domain/enums/`:

```ts
export enum EOrderStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
}

export enum EPaymentType {
  CASH = 'Cash',
  CREDIT_CARD = 'CreditCard',
  PIX = 'Pix',
}
```

Two known value-style exceptions exist: `EItemCategory` uses all-caps values (`PIZZA = 'PIZZA'`), and `EPaymentType.PIX = 'Pix'`. Stay consistent with the existing files.

## 5. Ids are a temporary constructor param

Every entity takes `id` with a `//TODO will be removed` marker. Don't design features around client-supplied ids — they will move to DB/auto-generated later.

## 6. Money is a plain `number`

No Decimal/currency type in the domain yet. Totals derive from `unitPrice * quantity` (see `OrderItems.totalPrice` and `Order.totalPrice`).

## 7. Repository interfaces live in `domain/repositories/`

The domain declares what persistence it needs; implementations live outside `domain/`. The files are currently empty stubs — fill them with interfaces, never Prisma code, when the application layer lands.
