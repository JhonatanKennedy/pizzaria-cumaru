# Comments

Code is read far more often than it is written, and a comment that restates the code doubles the reading without adding information. **Comments are only written when strictly needed** — when the code alone cannot carry the information.

The backend rulebook's `02`–`08` files draw a hard line around what they will explain; this file draws the line around what earns a comment.

## The rule in one sentence

If a reader can derive it from the code, don't comment it. If you comment it, say the *why*, never the *what*.

```ts
// ❌ — restates the code, adds nothing
// Throws when the order is closed.
if (this.status === EOrderStatus.CLOSED) {
  throw new Error('Cannot change a closed order');
}

// ✅ — no comment; the guard reads as a sentence on its own
if (this.status === EOrderStatus.CLOSED) {
  throw new Error('Cannot change a closed order');
}
```

## The one comment the codebase requires: the use-case header

Every use-case in `application/use-cases/` opens with a prose header and a `Feature:` traceability line. This is not decoration — it is the only place the link between a use-case and the product spec is recorded, and nothing in the signature or the body implies it. **All 32 use-cases carry it; a new one without it is incomplete.**

```ts
// ✅ — src/orders/application/use-cases/close-order.ts, as-is
// Close a local order with its payment type (manager only — waiter attempts
// are refused). The close waits for the kitchen: an order whose items are
// still "Pending" or "Preparing" cannot be billed. Items that never enter
// the kitchen and items already "Ready" never block.
// Features: 05_waiter_profile.feature, 07_manager_profile.feature.
@Injectable()
export class CloseOrderUseCase {
```

Two things the header must do:

- **State the business behavior, not the mechanics.** "The close waits for the kitchen" — not "calls `findById` then `close`". The steps are the code's job.
- **Name the feature file(s)** under the repo-root `features/` that this use-case implements (`Feature:` singular, `Features:` plural). This is the same traceability [02-testing.md](02-testing.md) demands of e2e specs: if you cannot name the scenario, the use-case is not ready to be written.

The header is not needed on entities, repositories, mappers or controllers — their names and the [domain rules](06-domain.md) already say what they are.

## When a second comment earns its place

1. **A rule mirrored from another layer, where the mirror is the point.** The reader sees the comparison but not why it must hold. One line prevents someone "simplifying" it away.

```ts
// ✅ — src/orders/domain/entities/order-items.ts, as-is
// One entry of a pizza composition: a flavor and the fatias it occupies on
// the pizza. The base flavor is always the first part.

// ✅ — the shape of a rule that must stay in sync with another layer
// Mirrors the backend's increase guard: once the kitchen has finished an
// item, a further portion would never be made, so the increase is refused.
```

2. **A non-obvious invariant the types can't express** — two values that must stay in step, or a fallback that exists for a reason.

3. **An empty or swallowed operation**, so the next reader knows it is deliberate and not a bug.

```ts
// ✅ — real case: logout must end the local session even when the
// backend call fails (token may already be expired or denylisted)
await revokeToken().catch(() => undefined);
clearSession();
```

4. **A configuration decision whose reason lives outside the file** — `prisma.config.ts` explaining why it loads `.env.local` by hand is the model.

```ts
// ✅ — prisma.config.ts (app root), as-is
// DATABASE_URL (with the database credentials) lives in the gitignored
// `.env.local`, which dotenv/config does not load by default.
loadEnv({ path: '.env.local' });
```

## What never justifies a comment

- **Section banners** (`// —————— Use-cases ——————`): split the file instead.
- **Todos about the current task**: that's what the task list, the PR description or the debt section of [08-conventions.md](08-conventions.md) is for. The two remaining stubs (`split-bill.ts`, `create-delivery-order.ts`) each carry a `// TODO` — they are the exception that proves the rule, because the stub body is otherwise empty and would read as a mistake.
- **Attribution or history**: git blame has it.
- **JSDoc on every method**: entity getters, DTOs and repository methods are typed and named; document only when the contract has a caveat.

## Mechanics

- English, same case rules as prose (see [08-conventions.md](08-conventions.md#3-language)).
- One to three lines; wrap at the same width as the code (prettier handles it).
- On its own lines above what it explains — not trailing on the same line.
- Prefer naming over commenting: a well-named helper or a named constant removes the need for the comment that would explain the inline code — `MINIMUM_ITEM_QUANTITY` is the model (see the [no-magic-numbers rule](03-javascript.md#1-no-magic-numbers)).
