# JavaScript good practices

These are language-level rules that apply to every `.ts` / `.tsx` file in the project. Examples use real project code where noted.

## 1. No magic numbers

A literal whose meaning isn't obvious from context goes into a named `const` — the name documents the _why_.

```ts
// ❌ — what does 15 mean here? A lockout duration, not an arbitrary number.
setTimeout(refresh, 15 * 60 * 1000);

// ✅ — the constant says what 15 stands for
const LOCKOUT_MINUTES = 15;
const MS_PER_MINUTE = 60 * 1000;

setTimeout(refresh, LOCKOUT_MINUTES * MS_PER_MINUTE);
```

Applies to time math too: `24 * 60 * 60 * 1000` becomes `const MS_PER_DAY = 24 * 60 * 60 * 1000;`. The rule targets literals with business meaning — trivial `0`/`1` as indexes or loop bounds are fine.

## 2. No nested ternaries

At most one `?:` per expression. Anything more becomes `if`/`else` or a named helper.

```tsx
// ❌ — two levels of ?: force the reader to re-scan
const badge =
  user.role === 'Manager'
    ? 'Gerente'
    : user.role === 'Waiter'
      ? 'Garçom'
      : 'Cozinheiro';

// ✅ — early returns, one branch per line (role.ts, as-is)
function getRoleLabel(role: UserRole): string {
  if (role === 'Manager') return 'Gerente';
  if (role === 'Waiter') return 'Garçom';
  return 'Cozinheiro';
}
```

## 3. `const` by default; `let` only when reassigned; never `var`

```tsx
// ❌
var total = 0;
let token = response.token; // never reassigned

// ✅
const token = response.token;
let total = 0; // reassigned below, so let is correct
```

## 4. Early returns over deep nesting

Guard clauses keep the happy path at the left margin. The real `RequireRole` (require-role.tsx) is the model:

```tsx
// ❌ — arrow code, the real logic sits 2 levels deep
if (user) {
  if (roles.includes(user.role)) {
    return children;
  }
}

// ✅ — one guard, then the happy path
if (!user) {
  return <Navigate to="/login" replace />;
}
if (!roles.includes(user.role)) {
  return <AccessDenied />;
}
return children;
```

## 5. Strict equality always

`===` and `!==` — never `==`/`!=`.

```ts
// ❌
if (user.role == 'Manager') { ... }

// ✅
if (user.role === 'Manager') { ... }
```

## 6. Nullish coalescing and optional chaining

Defaults via `??`, optional access via `?.` — not hand-rolled ternary checks.

```tsx
// ❌
const label = user.login !== undefined ? user.login : '';
const home = user ? roleHomePath(user.role) : '/login';

// ✅
const label = user.login ?? '';
const home = user ? roleHomePath(user.role) : '/login'; // (the second is a branch, not a default — already right)
```

## 7. Data transforms via `map`/`filter`/`reduce`, not manual loops

The real `app-layout.tsx` is the model:

```tsx
// ✅ — declarative, no index juggling (app-layout.tsx, as-is)
const visibleLinks = NAV_LINKS.filter((link) =>
  user ? link.roles.includes(user.role) : false,
);

// ❌ — manual loop restating what filter expresses
const visibleLinks = [];
for (let i = 0; i < NAV_LINKS.length; i += 1) {
  if (NAV_LINKS[i].roles.includes(user.role)) {
    visibleLinks.push(NAV_LINKS[i]);
  }
}
```

## 8. Boolean-returning functions read as questions

`isUserRole()` / `isValid()` — not `getRole()` / `getValid()`. The real guard in `pages/auth/business/role.ts` does this:

```ts
// ❌
getUserRole(): boolean {
  return typeof this.value === 'string';
}

// ✅ — reads naturally in an if (role.ts, as-is)
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
```

## 9. No boolean-trap parameters

A bare `true`/`false` at a call site is a magic value. Prefer dedicated functions (or an options object).

```tsx
// ❌ — what does false mean here?
setItemAvailable(itemId, false);

// ✅ — self-documenting
markItemUnavailable(itemId);
markItemAvailable(itemId);
```

## 10. No assignments or side effects inside conditions

```tsx
// ❌ — assignment hidden in the condition
if ((token = readToken())) { ... }

// ✅
const token = readToken();
if (token) { ... }
```
