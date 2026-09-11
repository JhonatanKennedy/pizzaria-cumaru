## Why

A pizza's size is a trailing token in its catalog name ("Mussarela G" / "Mussarela M"), parsed on both sides by `pizzaSizeOf` and relied on everywhere — the composer's fatia canvas, the same-size flavor pool, the backend's composition rules. Nothing in the product ever *produces* that token except the seed script. The manager's item form asks for name, description, price, category, preparation and ingredients, and `CreateItemDto` has no size field either, so the convention is real but unreachable: a manager can only hit it by knowing to type the suffix by hand, in exact case, with exactly one space. Worse, the form's default category is `PIZZA`, and `FlavorComposer` renders nothing for a token-less base — so the default path silently produces a pizza that can never be split, with no explanation on screen.

The archived `pizza-flavor-splits` design named this gap and deferred it ("registration UX for sizes is manager-side and out of scope here"), predicting the typo failure mode ("Mussarela H") that this change closes.

Two further defects reported alongside it, both independent of the size work:

- **The floor stays stale after opening a table.** `use-create-table-order` invalidates only `ORDERS_QUERY_KEY`, while `use-close-order` and `use-cancel-order` — the mutations that *release* a table — invalidate `TABLES_QUERY_KEY` too. Opening one invalidates nothing the floor reads, and `staleTime: 30_000` with `refetchOnWindowFocus` (which does not fire on in-app navigation) serves the cached listing, so the waiter lands back on a table still offering "Abrir mesa".
- **A dev-login bypass grants a session without the backend.** `DevLogin` renders under `import.meta.env.DEV` and writes a fake `{ id: 0, login: 'dev' }` blob plus a `pizzaria-cumaru.dev-session` marker that `auth.context.tsx` inspects to skip the boot refresh. It exists because the backend used to be unreachable; it is now a local `docker compose` service, so the fake session only produces a user whose every real request 401s.

## What Changes

- **Register a pizza per size from the manager item form.** The form gains a **Tamanho** selector (M / G / sem tamanho) rendered only when the category is `PIZZA`. On save the token is appended to the name; on edit the selection is derived from the existing name. The stored contract is unchanged — an item is still just a name, price and category — so there is no DTO, endpoint or migration change and `pizzaSizeOf` remains the single source of truth on both sides.
- **Keep "sem tamanho" selectable, with a hint.** The seed deliberately retains token-less legacy rows so past orders keep resolving their catalog item, so the option cannot be removed. Because such a pizza can never be composed, saving a `PIZZA` without a size surfaces a non-blocking hint on the form rather than a refusal.
- **Fix the stale floor after opening a table.** `use-create-table-order` also invalidates `TABLES_QUERY_KEY`, matching the two mutations that already do.
- **Remove the dev-login bypass.** `DevLogin` and its spec are deleted, along with `loginAsDev` from `AuthContextValue`, and the `DEV_KEY` / `writeDevSession` / `isDevSession` / `clearDevSession` marker in `auth-storage.ts`. Removing `isDevSession()` from the boot path simplifies `restore()`: with no cookie-less fake session to protect, a missing blob is the whole condition. `SeededProfiles` stays — it is a read-only hint listing the seeded logins and bypasses nothing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `manager-menu-stock`: the menu's "Manage the menu" requirement currently describes registering an item with name, description, price, category and preparation flag. It gains the size dimension — a pizza is registered per size, selecting M, G or no size, which is what makes it composable. The change applies to this capability because it owns the item form; the domain-level `catalog/management` create contract is unchanged, since a size is carried inside the name the API already accepts.

The floor-staleness and dev-login fixes change no requirement. `tables/management`'s "Listing the floor" already requires a table with an open order to carry its `orderId` — the SPA simply failed to honour it on the return trip — and the dev-login bypass appears in no capability at all (it is undocumented tooling, absent from `users/authentication`). Both are corrections that bring the code to the spec, so neither carries a delta.

## Impact

- **`apps/web/src/pages/manager/components/ItemFormDialog/`** — the Tamanho field, its hint, and its spec.
- **`apps/web/src/pages/manager/business/schemas.ts`** — the size selection joins the item form values; no new validation rule beyond the hint.
- **`apps/web/src/lib/flavor-composition.ts`** — `PIZZA_SIZES` and `pizzaSizeOf` are already exported and are consumed as-is; no change is expected, but the form becomes their first *producer*, so their unit spec gains a round-trip case (build a name, parse it back).
- **`apps/web/src/pages/waiter/hooks/use-create-table-order.ts`** — one invalidation line.
- **`apps/web/src/pages/auth/`** — `parts/DevLogin/` deleted; `login-page.tsx`, `auth-context.ts`, `auth.context.tsx` and `business/auth-storage.ts` lose the bypass; `auth-storage.spec.ts` loses its `dev sessions` block and `auth.context.spec.tsx` its dev-session boot test.
- **`apps/web/.claude/rules/01-project-context.md`** — the Auth section documents the `DevLogin` quick-entry; that sentence goes, or the rulebook would describe a control that no longer exists.
- **No API, DTO, Prisma or migration change.** The three fixes are web-only; the backend already supports sized items and already exposes the floor correctly.
- **Risk — existing token-less pizzas.** The seeded `Mussarela`/`Calabresa`/`Portuguesa`/`Quatro Queijos`/`Calabresa Especial` rows have no size token and must keep working as orderable items; the form must not treat them as invalid on edit.
