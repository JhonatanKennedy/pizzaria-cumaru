## Context

Domain errors are plain `Error`s with user-facing messages (project convention — no custom exception hierarchy). Nest turns them into `500 Internal server error` today. The specs define refusal messages that must reach the API response. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Domain errors surface as `400` with the spec message and a stable response shape.
- Request payloads are validated before they reach controllers.

**Non-Goals:**

- No exception *hierarchy* — the convention stays `throw new Error('...')`; the filter distinguishes nothing except "is this an `HttpException`?".
- No per-error 404 mapping: `'Order not found'` / `'Item not found'` also map to `400` (uniform rule, see D1). A subclass-based 404 mapping is deferred until a spec demands it.

## Decisions

### D1. Uniform 400 mapping

The filter catches every non-`HttpException` error and returns `400` with `{ statusCode: 400, message: error.message }`. Rationale: all current domain errors are *client-correctable business refusals*, and the specs never distinguish status codes. Alternative considered: 404 for not-found messages via message matching — rejected, fragile and unrequested.

### D2. Response shape

`{ statusCode, message }` — Nest's standard shape minus the optional `error` field. Clients read `message`.

### D3. Global wiring in main.ts

`app.useGlobalFilters(new DomainErrorFilter())` and `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`. No module needed for the filter.

### D4. DTO validation decorators

- `UpdateItemStatusDto.status`: `@IsIn(['Preparing', 'Ready'])` — the controller's manual `BadRequestException` for other values is deleted (the pipe now rejects them first).
- `CancelItemDto.reason`: `@IsString()` + `@IsNotEmpty()`.
- Later changes' DTOs (creation, checkout, catalog) ship decorated.

### D5. Dependencies

`class-validator` + `class-transformer` (ValidationPipe requirement). No others.

## Risks / Trade-offs

- [Validation errors carry class-validator's English text, not spec messages] → Acceptable: spec messages cover business rules; field-shape errors are developer-facing.
- [Uniform 400 hides server bugs] → A future observability change can add logging in the filter; out of scope here.

## Open Questions

None.
