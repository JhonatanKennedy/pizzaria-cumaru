# Domain (DDD) rules

`domain/` is pure TypeScript: no Nest decorators, no Prisma imports, no framework. That's what keeps the unit tests instant (see [02-testing.md](02-testing.md)).

## 1. Private constructor + `static create()` factory

Objects are created only through the factory, which validates and throws `Error` on invalid input. Every entity (`User`, `Order`, `OrderItems`, `Item`, `Ingredient`) follows this. `User` shows the smallest faithful example:

```ts
export class User {
  private constructor(
    private readonly id: number,
    private readonly login: string,
    private readonly passwordHash: string,
    private readonly role: EUserRole,
    private failedAttempts: number,
    private lockedUntil?: Date,
  ) {}

  static create(params: ICreateUserParams): User {
    if (!params.login.trim()) {
      throw new Error('Login is required');
    }
    if (!params.passwordHash) {
      throw new Error('Password is required');
    }
    return new User(
      params.id,
      params.login,
      params.passwordHash,
      params.role,
      params.failedAttempts ?? 0,
      params.lockedUntil,
    );
  }
}
```

Never `new` an entity outside its file. Defaults live in the factory (`params.failedAttempts ?? 0`, `params.flavors ?? []`). `Order` and `OrderItems` add a `static restore(params)` factory that rehydrates persisted state — every field, including mutable status and timestamps, comes from the params.

## 2. State changes only through explicit methods

No setters, no public mutable fields. Mutations are domain verbs with invariant checks: `addItem`, `removeItem`, `cancelItem`, `cancelPreparationItem`, `close`, `startDeliveryPreparation`, `sendOutForDelivery`, `markDelivered`, `startPreparation`, `finishPreparation`, `cancel`, `rename`, `changePrice`, `replaceIngredients`, `markInStock`, `markOutOfStock`, `registerFailedAttempt`. Reads happen through getters — collection getters return a readonly view (see [04-typescript.md](04-typescript.md#3-readonly-everything-that-must-not-change)).

## 3. Invariants enforced at every mutation point

The same rule that guards creation guards later mutations — a valid object can never drift into an invalid state. `OrderItems` is the model:

```ts
// ✅ — creation validates every field it owns (order-items.ts, as-is)
static create(params: CreateOrderItemParams): OrderItems {
  if (params.quantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }
  if (params.unitPrice < 0) {
    throw new Error('Unit price cannot be negative');
  }
  return new OrderItems(/* ... */);
}
```

The mutations carry the same guards: `decreaseQuantity` re-checks `quantity <= 0` *and* the `MINIMUM_ITEM_QUANTITY` floor, so a `create`-valid item can never be driven below the minimum by a later call. That paired example lives in the [no-magic-numbers rule](03-javascript.md#1-no-magic-numbers) — read it there rather than expecting the mutation half repeated here.

Guarded transitions live on the aggregate the same way: `Order.close(paymentType, closedAt)` rejects already-closed and empty orders, and the delivery-cycle verbs (`startDeliveryPreparation`, `sendOutForDelivery`, `markDelivered`) each throw `'Invalid delivery status transition'` when the order is not in the expected state.

## 4. Enums: `E` prefix, SCREAMING_SNAKE members, title-cased string values

One enum per file in `domain/enums/`:

```ts
export enum EOrderStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
  CANCELLED = 'Cancelled',
  PREPARING = 'Preparing',
  OUT_FOR_DELIVERY = 'Out for delivery',
  DELIVERED = 'Delivered',
}

export enum EPaymentType {
  CASH = 'Cash',
  CREDIT_CARD = 'CreditCard',
  PIX = 'Pix',
}
```

Known style exceptions: `EItemCategory` uses all-caps values (`PIZZA = 'PIZZA'`), `EPaymentType.PIX = 'Pix'`, and delivery-cycle members may contain spaces (`OUT_FOR_DELIVERY = 'Out for delivery'`). Enum values are what get persisted — see [07-prisma.md](07-prisma.md). Stay consistent with the existing files.

`EOrderStatus` mixes the order lifecycle with the delivery cycle; `PrismaOrdersRepository.findAllOpen` compensates with type-aware status filters, and splitting the two axes is an open question recorded in [08-conventions.md](08-conventions.md) — not a licence to add a seventh member casually.

## 5. Ids are constructor params — persistence owns generation

Aggregates receive `id` as a constructor param: `User.id` is a `number` (DB `Int` autoincrement), every other aggregate a `string` (DB `uuid()` default — see [07-prisma.md](07-prisma.md#4-schema-mirrors-aggregates-enums-persist-as-strings)). Don't design features around client-supplied ids — persistence owns generation, and mappers fill ids on rehydration. Only `TCreateOrderParams.id` still carries a `//TODO will be removed` marker.

## 6. Money is a plain `number`

No Decimal/currency type in the domain yet. Totals derive from `unitPrice * quantity` (see `OrderItems.totalPrice` and `Order.totalPrice`); prices persist as `Float` in the database.

## 7. Repository interfaces live in `domain/repositories/`

The domain declares what persistence it needs; implementations live in `infrastructure/` and hit Prisma. All three interfaces are populated and exported with a `Symbol` injection token bound in the context module:

| Interface            | Token                | Implementation                                                        |
| -------------------- | -------------------- | --------------------------------------------------------------------- |
| `IOrdersRepository`  | `ORDERS_REPOSITORY`  | `PrismaOrdersRepository` (+ `infrastructure/mappers/order-mapper.ts`) |
| `ICatalogRepository` | `CATALOG_REPOSITORY` | `PrismaCatalogRepository`                                             |
| `IUserRepository`    | `USER_REPOSITORY`    | `PrismaUserRepository`                                                |

Repository interfaces and implementations contain no business rules; enums cross the persistence boundary as strings guarded by parse guards (`parseRole`, `parseItemCategory`, the order-mapper guards) that throw `Unknown <thing>: <value>` on unrecognized values.
