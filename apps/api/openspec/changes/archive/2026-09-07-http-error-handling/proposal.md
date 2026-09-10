## Why

Domain rules throw short, human-readable errors (`'Cannot cancel an item in preparation'`) that the specs promise will surface to users. Today the HTTP layer has no error handling: every domain error becomes a bare `500 Internal server error`, and nothing validates request payloads. This change makes the API behave as the specs describe before more endpoints are built on top of it.

## What Changes

- **Global exception filter** — plain `Error` instances thrown by domain rules and use-cases are mapped to `400 Bad Request` with the response body `{ statusCode, message }`, where `message` is the domain error text. Nest `HttpException`s pass through untouched.
- **Global `ValidationPipe`** — request payloads are validated with `class-validator` decorators (new dependencies: `class-validator`, `class-transformer`); unknown fields are stripped (`whitelist`). Invalid payloads return `400` with the validation message.
- **DTO decorators on existing DTOs** — `UpdateItemStatusDto.status` restricted to `Preparing`/`Ready` (the controller's manual `BadRequestException` branch becomes redundant and is removed); `CancelItemDto.reason` required and non-empty.
- Every future DTO in later changes ships with `class-validator` decorators from the start.

## Capabilities

### New Capabilities

None — error mapping is presentation infrastructure, not system behavior. The refusal messages themselves are already specified in the capability specs (`orders/order-item-status`, and the upcoming creation/checkout/catalog/delivery specs).

### Modified Capabilities

None.

## Impact

- `src/main.ts` — global filter + `ValidationPipe` wiring.
- `src/common/filters/domain-error.filter.ts` — new (first file in `src/common/`).
- `src/orders/presentation/dtos/` — `update-item-status.dto.ts`, `cancel-item.dto.ts` gain decorators.
- `src/orders/presentation/controllers/orders.controller.ts` — redundant `BadRequestException` branch removed.
- `package.json` — `class-validator`, `class-transformer` dependencies.
- Observable change: domain errors over HTTP go from `500` to `400` with the spec message — this is the intended behavior fix.
