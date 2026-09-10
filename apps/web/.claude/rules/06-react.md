# React good practices

React 19, function components and hooks only — there is not one class component in the codebase, and there should never be one. These rules are grounded in the code as it stands; the ✅ examples are real files.

## 1. One component per file, in a folder named after it

Where the files live is [08-conventions.md](08-conventions.md#2-file-naming-and-the-context-skeleton); the React-side rule is that a file exports exactly one component.

```tsx
// ❌ — two exported components in one file; neither can be found by name
export function Button() { ... }
export function ButtonGroup() { ... }
```

A **file-private** helper component is the exception and belongs where only one caller needs it — `SalesFilters/index.tsx` keeps a local `ChipGroup<T>` because nothing outside that file renders a filter chip. The moment a second file wants it, it moves to `components/`.

Screens are the other exception and stay single bare-kebab files (`kitchen-page.tsx`, `tables.tsx`) until they grow parts, at which point they become `pages/<screen>/` with a `parts/` folder.

## 2. Props are an interface, destructured, with defaults in the signature

Declare `interface <Component>Props`, destructure in the signature, and default in the destructuring rather than with `defaultProps` or inline `??`. When wrapping a native element, extend its attribute type so the component forwards real DOM props instead of re-declaring a subset.

```tsx
// ✅ — src/components/Button/index.tsx, as-is
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps): React.ReactNode {
  return (
    <button type={type} className={`btn-primary ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
```

Spread `...rest` last so a caller can override your defaults. Annotate the return type `React.ReactNode` — it is the house signature for every component.

## 3. Server state belongs to TanStack Query — never to `useEffect` + `fetch`

Data that lives on the backend is a query; changing it is a mutation. A component never calls `apiRequest`, and a hook never opens a `useEffect` to load data.

```ts
// ✅ — src/pages/kitchen/hooks/use-kitchen-queue.ts, as-is
const REFRESH_INTERVAL_MS = 15 * 1000;

export function useKitchenQueue() {
  return useQuery({
    queryKey: KITCHEN_QUEUE_KEY,
    queryFn: listKitchenQueue,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ❌ — hand-rolled polling: no cache, no dedupe, no invalidation
useEffect(() => {
  const id = setInterval(() => fetch('/kitchen/queue').then(setQueue), 15000);
  return () => clearInterval(id);
}, []);
```

`refetchInterval` is how the kitchen screen polls; `refetchOnWindowFocus` is how the order list stays fresh. Both live on the query, never in an effect.

Mutations invalidate in `onSuccess` — never refetch by hand:

```ts
// ✅ — src/pages/waiter/hooks/use-update-item-quantity.ts, as-is
return useMutation({
  mutationFn: ({ orderId, orderItemId, quantity }: IUpdateItemQuantityInput) =>
    updateOrderItemQuantity(orderId, orderItemId, quantity),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
  },
});
```

Query keys come from the shared api modules (`ORDERS_QUERY_KEY`, `KITCHEN_QUEUE_KEY`), never as inline arrays — that is what lets a mutation in one context refresh a list in another.

## 4. `useEffect` is for synchronising with something outside React — which is almost never

The codebase has exactly one `useEffect`, and it earns its place: it registers the session-expiry handler with a non-React module and unregisters on unmount.

```tsx
// ✅ — src/pages/auth/auth.context.tsx, as-is
useEffect(() => {
  registerSessionExpiryHandler(() => setUser(null));
  return () => registerSessionExpiryHandler(null);
}, []);
```

Before writing one, check the list: deriving a value, fetching data, resetting state on a prop change, and reacting to an event are all handled better by computing during render, TanStack Query, a `key`, or an event handler. An effect that only calls `setState` is a bug — it costs a second render and a frame of stale UI.

## 5. Derive during render; keep `useState` for state the user can change

If a value can be computed from props or other state, compute it in the render body. Mirroring it into `useState` (or syncing it with an effect) creates a second source of truth that can disagree with the first.

```tsx
// ✅ — derived, no state (src/routes/layout/AppLayout/index.tsx, as-is)
const visibleLinks = NAV_LINKS.filter((link) =>
  user ? link.roles.includes(user.role) : false,
);

// ❌ — state that has to be kept in sync by hand
const [visibleLinks, setVisibleLinks] = useState(NAV_LINKS);
useEffect(() => setVisibleLinks(NAV_LINKS.filter(...)), [user]);
```

`useState` is for what the user controls: open dialogs, filter selections, form drafts — which is what `MenuTab` and the `*Dialog` components use it for.

The inverse is just as deliberate: `SalesFilters` holds **no** state. It takes `filters` plus `onTypeChange` / `onPaymentChange` / `onCategoryChange` and is driven entirely by its parent, so the filter state has exactly one owner and the component is trivial to test. Push state up to the screen that needs it rather than duplicating it down the tree.

## 6. Business rules live in `business/`, not in components

A predicate that decides whether an action is available is a pure function in the context's `business/` folder, with its own spec — not an inline condition inside JSX. The component imports it.

```ts
// ✅ — src/pages/waiter/business/has-items-in-preparation.ts, as-is
// Mirrors the backend's close guard: closing is refused while any kitchen
// item of the order is still Pending or Preparing.
export function hasItemsInPreparation(
  items: ReadonlyArray<{ status: string | null }>,
): boolean {
  return items.some(
    (item) => item.status === 'Pending' || item.status === 'Preparing',
  );
}
```

```tsx
// ✅ — the component asks the rule, it does not restate it
const canClose = user?.role === 'Manager' && !hasItemsInPreparation(items);

// ❌ — the rule, duplicated in JSX where nothing can test it
{user?.role === 'Manager' && !items.some((i) => i.status === 'Pending' || i.status === 'Preparing') && (
```

This is what keeps a business rule testable in milliseconds (see [02-testing.md](02-testing.md)).

## 7. Lists need a key from the data's identity

```tsx
// ✅ — the destination is the identity (AppLayout, as-is)
{visibleLinks.map((link) => (
  <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
))}

// ❌ — the index is positional, not identity: reordering re-uses the wrong node
{visibleLinks.map((link, index) => <NavLink key={index} ... />)}
```

## 8. Conditional rendering: guards for absence, `&&` for presence

```tsx
// ✅ — early return for the absent case (require-role.tsx, as-is)
if (!user) {
  return <Navigate to="/login" replace />;
}
if (!roles.includes(user.role)) {
  return <AccessDenied />;
}
return children;

// ✅ — `&&` for a block that may simply not render (AppLayout, as-is)
{visibleLinks.length > 0 && <nav aria-label="Principal">...</nav>}
```

Never nest ternaries — the rule and its alternative are in [03-javascript.md](03-javascript.md#2-no-nested-ternaries). When branching on a union value, use an exhaustive `switch` with a `never` default ([04-typescript.md](04-typescript.md#6-every-union-member-is-handled)).

## 9. Accessibility is part of the component, not a later pass

Prefer real semantics — `<button>`, `<label>`, `<nav>` — over a `div` with a click handler. Add `aria-label` when the only label is visual, and `role="alert"` for surfaced errors. Tests then query by role and label, which is also what makes them robust.

```tsx
// ✅ — a labelled landmark (AppLayout, as-is)
<nav aria-label="Principal">...</nav>

// ✅ — errors are announced, not just coloured (TextField, as-is)
<p role="alert" className="mt-1 text-sm text-red-700">

// ✅ — a control whose only label is visual still has an accessible name,
//     in pt-BR like every other user-facing string (FlavorComposer, as-is)
aria-label={`Diminuir ${allocation.item.name}`}

// ✅ — a toggle says its state instead of relying on the styling
aria-pressed={selected === null}   // SalesFilters, as-is
```

```tsx
// in the spec — query the way a user finds it, which is also the most
// change-resistant selector
await user.click(screen.getByRole('button', { name: 'Entrar' }));
```

User-facing strings are pt-BR — labels, headings, placeholders and validation messages (see [08-conventions.md](08-conventions.md#3-language)). Backend error messages are the exception and surface verbatim.

## 10. Memoize only with a measured reason

There is no `useMemo`, no `React.memo` and no `useCallback` outside the auth provider in this codebase, and that is deliberate. React 19 is fast enough for lists this size; `useMemo` costs a dependency comparison and a cache entry and buys nothing when the computation is a `filter` over a handful of items.

```tsx
// ✅ — cheap derivation, computed plainly every render
const visibleLinks = NAV_LINKS.filter((link) => link.roles.includes(user.role));

// ❌ — ceremony with no measured win
const visibleLinks = useMemo(
  () => NAV_LINKS.filter((link) => link.roles.includes(user.role)),
  [user],
);
```

`useCallback` is justified where it is used: the auth provider hands functions to a context `value`, and a fresh identity every render would re-render every consumer. That is a real cost — match it, don't copy it.
