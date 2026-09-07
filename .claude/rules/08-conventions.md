# Project conventions

## 1. ESM import specifiers always end in `.js`

Even for `.ts` files (NodeNext ESM). Never `./x` or `./x.ts` in real imports.

```ts
// ✅
import { Order } from '../entities/orders.js';
import { OrderItems } from './order-items.js';

// ❌
import { Order } from '../entities/orders';
import { OrderItems } from './order-items.ts';
```

## 2. File naming

| Kind | Pattern | Examples |
| --- | --- | --- |
| Entity | bare kebab, one class per file | `orders.ts`, `order-items.ts`, `items.ts` |
| Enum | bare kebab | `order-status.ts`, `payment-type.ts` |
| Controller | `*.controller.ts` | `orders.controller.ts` |
| DTO | `*.dto.ts` | `create-order.dto.ts` |
| Module | `*.module.ts` | `orders.module.ts` |

## 3. Language

Code, identifiers, comments, tests, and the Gherkin specs in `features/` are all in English.

## 4. Format & lint before committing

Prettier (`singleQuote: true`, `trailingComma: "all"`) and oxlint are configured — run `npm run format` and `npm run lint` and keep both passing.

## 5. Error messages

Domain errors are short, capitalized, human-readable strings thrown via `throw new Error(...)`: `'Order is closed'`, `'Name is required'`, `'Quantity must be greater than zero'`. They will surface to API responses later, so write them for a user, not a developer.

## 6. Observability

`app.module.ts` exports `{ ObserveModule, ObserveInstrument }` from `@nestjs/observe`, configured with placeholder `YOUR_APP_KEY` / `YOUR_APP_SECRET`. `main.ts` passes `instrument: ObserveInstrument` to `NestFactory.create`. Leave as-is unless asked.

## 7. Open questions — resolve before building features

Current files may be moved, renamed, or deleted:

- `src/catalog/` and `src/restaurant/` are exact duplicates. Which context owns `Item`/`Ingredient`? `restaurant` was presumably meant for tables/local-ordering concerns (the `LOCAL` order type / `tableId`), not a copy of the catalog.
- `ingridients.ts` is a consistent typo for "ingredients" — decide whether to keep it (as the canonical name) or fix it everywhere.
- Repository interface files (`domain/repositories/*`) are all empty across contexts.
- `OrdersController` and the `/orders` use cases are commented-out stubs returning `'teste'`.
- No global error handling, validation pipe, auth, or users module yet (`users/` only has empty domain files).
