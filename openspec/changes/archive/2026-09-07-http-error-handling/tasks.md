## 1. Dependencies

- [x] 1.1 Install `class-validator` and `class-transformer` and verify `npm run build` passes

## 2. Filter and wiring

- [x] 2.1 Create `src/common/filters/domain-error.filter.ts` implementing `ExceptionFilter`: plain `Error` → `400 { statusCode, message }`, `HttpException` → passthrough, and verify a unit test covers the plain-error mapping and the passthrough
- [x] 2.2 Wire the filter and `new ValidationPipe({ whitelist: true, transform: true })` in `src/main.ts` via `useGlobalFilters` / `useGlobalPipes` and verify the app boots (`npm run build`)

## 3. DTOs and controller

- [x] 3.1 Add `@IsIn(['Preparing', 'Ready'])` to `UpdateItemStatusDto.status` and `@IsString()` + `@IsNotEmpty()` to `CancelItemDto.reason`, and verify `npm run build` passes
- [x] 3.2 Remove the now-redundant `BadRequestException('Invalid status')` branch from `orders.controller.ts` and verify the PATCH route still type-checks

## 4. Verification

- [x] 4.1 Add e2e assertions to `test/order-status.e2e-spec.ts`: invalid transition (`status: "Ready"` on a Pending item) returns 400 with `{ message: "Item is not in preparation" }`, unknown `status` value returns 400, cancellation without a reason returns 400, and PATCH on a nonexistent order returns 400 with `{ message: "Order not found" }`; verify `npm run test:e2e` passes
- [x] 4.2 Run `npm run format`, `npm run lint`, `npm test`, and `npm run test:e2e` and verify all pass
