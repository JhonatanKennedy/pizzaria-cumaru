# TypeScript rules

The compiler is the first reviewer — `strict: true` (TS 6 default) plus these rules keep types meaningful instead of decorative. Note also `erasableSyntaxOnly: true` in `tsconfig.app.json`: TS-only runtime syntax (enums, namespaces, parameter properties, class fields with `declare`) is a compile error.

## 1. Never `any`

`any` switches the compiler off exactly where it matters. Use `unknown` + narrowing, or generics. API responses arrive as `unknown` from `apiRequest` and are zod-validated before use — the real pattern in this codebase:

```ts
// ❌ — any turns off all checking downstream
function readUser(raw: any): StoredUser {
  return raw.user;
}

// ✅ — unknown forces validation before use (auth-storage.ts, as-is)
function isStoredUser(value: unknown): value is StoredUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.login === 'string' &&
    isUserRole(candidate.role)
  );
}
```

## 2. `interface` vs `type`

- **`interface`** — object contracts meant to be implemented or extended (`StoredUser`, `AuthUser`, `AuthContextValue`).
- **`type`** — what interfaces can't express: unions, tuples, primitive aliases, mapped types, `z.infer` results.

```ts
// ✅ interface — a contract for something the caller hands a hook or api module
export interface IUpdateItemQuantityInput {
  orderId: string;
  orderItemId: string;
  quantity: number;
}

// ✅ type — a union, which interfaces cannot express
export type UserRole = (typeof USER_ROLES)[number];
```

**Repo convention — the prefix says which side of the boundary the name lives on:**

| Prefix        | Kind      | What it names                                                                                                              |
| ------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `I`           | interface | Hook inputs and api payloads (`IUpdateItemQuantityInput`, `IAddItemPayload`), shared listing entries (`ITableListingEntry`) |
| `T`           | type      | `z.infer` results (`TMenuItem`, `TOrderListing`), unions (`TOrderType`, `TPaymentType`), derived shapes (`TEnrichedOrder`)  |
| *(no prefix)* | interface | Component props (`ButtonProps`, `SaleCardProps`), context and session shapes (`AuthContextValue`, `StoredUser`)             |

So `ButtonProps` takes no prefix while `IAddItemInput` does — props are a component's public surface, hook inputs are a module contract.

Three outliers, left alone: `TDaySalesFilters` and `TCategoryQuantity` are `interface`s despite the `T`; `TEnrichedOrder` is an `interface`-shaped `type` and is fine either way.

## 3. `readonly` everything that must not change

Constants and props that must not change are `readonly` — never hand out live mutable references.

```ts
// ❌ — caller can mutate the shared list
export const NAV_LINKS: NavLinkItem[] = [ ... ];

// ✅ (app-layout.tsx, as-is)
const NAV_LINKS: readonly NavLinkItem[] = [ ... ];
```

## 4. Literal unions via `as const` — no TS enums

Any closed set of domain values is an `as const` array + derived union — never a bare string literal in logic, and never a TS enum (forbidden by `erasableSyntaxOnly`, and unions drop straight into zod). The real role union (pages/auth/business/role.ts):

```ts
// ✅ — one source of truth, zod-compatible, no runtime cost
export const USER_ROLES = ['Waiter', 'Cook', 'Manager'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// in a schema: z.enum(USER_ROLES)

// ❌ — enum: erasableSyntaxOnly rejects it, and zod can't reuse it directly
enum EUserRole {
  Waiter = 'Waiter',
  Cook = 'Cook',
  Manager = 'Manager',
}

// ❌ — bare string literals: typos fail silently
if (user.role === 'Waiterr') { ... }
```

## 5. No unsafe casts

No `as` when a type guard or proper typing does the job. A cast is a promise to the compiler — honor it only after runtime validation, never to silence an error. The narrow `as Record<string, unknown>` in a type guard after the `typeof value === 'object'` check is the acceptable form.

```ts
// ❌ — cast lies: data could be anything at runtime
const response = await apiRequest('/auth/login') as TLoginResponse;

// ✅ — validated before it's typed (auth.api.ts, as-is)
const data = await apiRequest('/auth/login', { method: 'POST', body: ... });
return loginResponseSchema.parse(data);
```

## 6. Every union member is handled

Adding a member to a union must break the build, not slip through at runtime. A `Record<Union, T>` map gets that for free with no branch at all — the shape `role.ts` uses (see [03-javascript.md](03-javascript.md#2-no-nested-ternaries)). When the branches genuinely differ in behaviour and you reach for a `switch`, the `default` branch must be `never`, so the forgotten member becomes a compile error:

```ts
default: {
  const unreachable: never = role;
  throw new Error(`Unhandled role: ${unreachable}`);
}
```

## 7. No non-null assertions

`!` is a compile-time lie about runtime. Optional values stay optional; handle absence — `main.tsx` checks the root element instead of asserting it.

```tsx
// ❌ — crashes at runtime when root is missing
createRoot(document.getElementById('root')!).render(<App />);

// ✅ (main.tsx, as-is)
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
createRoot(rootElement).render(<App />);
```

## 8. Explicit return types on public functions

Annotate public function signatures (`function isUserRole(value: unknown): value is UserRole`, `function roleHomePath(role: UserRole): string`); let inference handle locals and arrow callbacks. Explicit returns make APIs self-documenting and catch accidental signature drift.
