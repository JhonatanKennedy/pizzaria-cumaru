# NestJS rules

## 1. Thin controllers

Controllers translate HTTP → use-case → HTTP. No business rules, no direct Prisma calls, no string returns. Every controller in the codebase (`OrdersController`, `ItemsController`, `KitchenQueueController`, `AuthController`) already follows this shape:

```ts
// ✅ — as implemented across the app
@Controller('/orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly addItemToOrderUseCase: AddItemToOrderUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.createOrderUseCase.execute(dto);
  }

  @Post(':orderId/items')
  addItem(@Param('orderId') orderId: string, @Body() dto: AddItemToOrderDto) {
    return this.addItemToOrderUseCase.execute({ orderId, ...dto });
  }
}

// ❌ — business logic and persistence in the controller (never)
@Post()
create(@Body() dto: CreateOrderDto) {
  if (dto.paymentType === EPaymentType.PIX) { /* fee rule */ }
  return this.prisma.order.create({ data: dto });
}
```

## 2. One module per context

Each `src/<context>/` has one `<context>.module.ts` declaring its controllers and providers. Wiring happens in modules — see the module layout in [01-project-context.md](01-project-context.md).

## 3. DTOs: one class per use-case, in `presentation/dtos`

Plain classes with `class-validator` decorators, request-shaped — never reuse a domain entity as a payload. Optional request fields are marked `?` so required-ness is explicit in the type.

A global `ValidationPipe({ whitelist: true, transform: true })` is registered as `APP_PIPE` in `app.module.ts` (not `main.ts`) and applies to every controller. Consequences:

- **`whitelist: true` strips undeclared body fields** — a DTO property without decorators is silently dropped, so every required field must carry one (`@IsString`, `@IsNotEmpty`, `@IsInt`, `@Min(1)`, …).
- **`transform: true`** converts the plain body into the DTO class instance before validation.
- Route params (`@Param`) and query strings are **not** validated by the pipe — keep them typed as `string` and let use-cases/domain reject unknown ids.

```ts
// ✅ — current CreateOrderDto (presentation/dtos/create-order.dto.ts)
export class CreateOrderDto {
  @IsInt()
  userId: number;

  @IsIn([EOrderType.LOCAL, EOrderType.DELIVERY])
  type: EOrderType;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

Enum-valued fields validate against the domain enum (as above) or with `@IsEnum(EItemCategory)` — not against re-typed literal lists (`CloseOrderDto` and `UpdateDeliveryOrderStatusDto` still hard-code literals; see known debt in [08-conventions.md](08-conventions.md)). Only exception to the `presentation/dtos/` folder: `LoginDto` is defined inline in `auth.controller.ts`.

## 4. RESTful routes

Resource nouns, HTTP verbs as actions, sub-resources nested. Never verbs in paths.

```ts
// ✅
POST  /orders
GET   /orders
POST  /orders/:orderId/items
PATCH /orders/:orderId/items/:itemId/quantity

// ❌
POST /createOrder
POST /orders/:orderId/addItem
```

Item *status* is not a routable sub-resource — the kitchen drives it through its own verbs (`POST /kitchen/orders/:orderId/items/:orderItemId/start|finish|cancel`), so there is no `PATCH .../items/:itemId/status`.

## 5. Constructor injection — never `new` a Nest provider

`PrismaModule` is `@Global()`, so inject `PrismaService` anywhere. Only its own constructor builds the driver adapter.

```ts
// ❌ — bypasses DI
@Injectable()
export class OrdersService {
  private prisma = new PrismaService();
}

// ✅
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}
}
```

## 6. Controllers call use-cases — don't skip the application layer

Controllers call use-cases in `application/use-cases/`; use-cases orchestrate domain entities and repository interfaces; repositories (in `infrastructure/`) hit Prisma. Use the layer even where a use-case is a one-line delegate — the boundary is what keeps controllers thin and domain rules testable. `OrdersModule` exports its preparation use-cases so `KitchenModule` can drive them. Two orders use-cases are still unimplemented stubs (`SplitBillUseCase`, `CreateDeliveryOrderUseCase`) — fill them, don't route around them.

## 7. Config via `ConfigService`

`ConfigModule.forRoot({ isGlobal: true })` is set in `AppModule` — prefer `ConfigService` in new providers (as `UsersModule` does for the `JWT_SECRET` fed to `JwtModule.registerAsync`). Documented exception: `PrismaService` reads `process.env.DATABASE_URL` directly (see [07-prisma.md](07-prisma.md)); leave that unless changing the Prisma setup.

## 8. Authorization: global `RolesGuard`, JWT without passport

`RolesGuard` is registered as `APP_GUARD` in `app.module.ts` and protects every route by default. It requires an `Authorization: Bearer <JWT>` header, verifies the token against `JWT_SECRET` with `@nestjs/jwt` (no passport), rejects tokens whose `jti` is on the `DeniedToken` denylist (`POST /auth/logout` adds entries), then checks role requirements. Controllers express policy with the decorators exported from `src/common/guards/roles.guard.ts`:

```ts
@Public() // skip auth entirely — only POST /auth/login uses this
@Roles({ roles: [EUserRole.MANAGER] }) // manager only
@Roles({
  roles: [EUserRole.WAITER, EUserRole.MANAGER],
  message: 'Only the manager can close the order', // optional 403 body
})
```

The full role/permission matrix is documented in a comment at the top of `roles.guard.ts`. Use-cases never read headers or tokens — they receive plain params.
