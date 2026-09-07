# NestJS rules

## 1. Thin controllers

Controllers translate HTTP → use-case → HTTP. No business rules, no direct Prisma calls, no string returns. The commented stubs in `OrdersController` show the intended shape:

```ts
// ✅ — intended shape (application/ use-cases don't exist yet)
@Controller('/orders')
export class OrdersController {
  constructor(private readonly createOrderUseCase: CreateOrderUseCase) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.createOrderUseCase.execute(dto);
  }

  @Post(':orderId/items')
  addItem(@Param('orderId') orderId: string, @Body() dto: AddItemToOrderDto) {
    return this.addItemToOrderUseCase.execute({ orderId, ...dto });
  }
}

// ❌ — business logic and persistence in the controller
@Post()
create(@Body() dto: CreateOrderDto) {
  if (dto.paymentType === EPaymentType.PIX) { /* fee rule */ }
  return this.prisma.order.create({ data: dto });
}
```

## 2. One module per context

Each `src/<context>/` has one `<context>.module.ts` declaring its controllers and providers. Wiring happens in modules — see the module layout in [01-project-context.md](01-project-context.md).

## 3. DTOs: one class per use-case, in `presentation/dtos`

Plain classes, request-shaped — never reuse a domain entity as a payload. Optional request fields are marked `?` so required-ness is explicit in the type. When real endpoints are wired, add `class-validator` decorators and a global `ValidationPipe` in `main.ts` (neither is installed/configured yet — on the roadmap, not a reason to skip DTOs):

```ts
// ✅ — current CreateOrderDto (presentation/dtos/create-order.dto.ts)
export class CreateOrderDto {
  userId: string;
  type: EOrderType;
  paymentType: EPaymentType;
  tableId?: string;
  notes?: string;
}
```

## 4. RESTful routes

Resource nouns, HTTP verbs as actions, sub-resources nested. Never verbs in paths.

```ts
// ✅
POST  /orders
GET   /orders
POST  /orders/:orderId/items
PATCH /orders/:orderId/items/:itemId/status

// ❌
POST /createOrder
POST /orders/:orderId/addItem
```

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

## 6. Don't skip the application layer

Controllers call use-cases (`application/`), use-cases orchestrate domain entities and repositories, repositories hit Prisma. While the app is scaffolded the layer doesn't exist yet — when it lands, use it even where it's a one-line delegate; the boundary is what keeps controllers thin and domain rules testable.

## 7. Config via `ConfigService`

`ConfigModule.forRoot({ isGlobal: true })` is set in `AppModule` — prefer `ConfigService` in new providers. Documented exception: `PrismaService` reads `process.env.DATABASE_URL` directly today (see [07-prisma.md](07-prisma.md)); leave that unless changing the Prisma setup.
