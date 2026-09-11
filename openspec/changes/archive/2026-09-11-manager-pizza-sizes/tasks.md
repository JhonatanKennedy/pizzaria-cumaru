## 1. Register a pizza per size (commit 1)

- [x] 1.1 Add the size selection to `pages/manager/business/schemas.ts` — an optional size on `TItemFormValues`, defaulting to none — and verify `business/schemas.spec.ts` covers that a PIZZA with no size still parses (the legacy-row case), so the "sem tamanho" path is never refused
- [x] 1.2 Add the round-trip case to `lib/flavor-composition.spec.ts`: a name built from a base plus each `PIZZA_SIZES` entry parses back to the same size, and a token-less base parses to `null`
- [x] 1.3 Add the **Tamanho** selector to `components/ItemFormDialog/index.tsx`, its options derived from `PIZZA_SIZES` (never a literal list) with a "sem tamanho" choice, rendered only when the category is `PIZZA`; verify `item-form-dialog.spec.tsx` asserts the control is absent for a non-pizza category
- [x] 1.4 Initialise the selector on edit by running `pizzaSizeOf` over the item's name, and compose the token onto the name on both create and update; verify `item-form-dialog.spec.tsx` asserts the created payload's name carries the token and that editing a sized pizza pre-selects its size
- [x] 1.5 Show a non-blocking notice while a `PIZZA` has no size selected, bound to the selection so it disappears once one is chosen; verify `item-form-dialog.spec.tsx` asserts the notice appears for the token-less case and that saving still goes through
- [x] 1.6 Run `npm test -w apps/web`, `npm run lint`, and `npx prettier --check "src/**/*.{ts,tsx,css}"` from `apps/web`, and verify all green with the existing `ItemFormDialog` and `schemas` cases unedited

## 2. Refresh the floor when a table is opened (commit 2)

- [x] 2.1 Add `TABLES_QUERY_KEY` to the invalidation in `pages/waiter/hooks/use-create-table-order.ts`, matching `use-close-order` and `use-cancel-order`; verify by opening a table and navigating straight back — the card must show the open order instead of "Abrir mesa"
- [x] 2.2 Extend the waiter tables spec with the ordering case (the create mutation invalidates the floor key), or verify the existing suite still passes if the hook is covered indirectly, and run `npm test -w apps/web`

## 3. Remove the dev-login bypass (commit 3)

- [x] 3.1 Delete `pages/auth/pages/login/parts/DevLogin/` (both `index.tsx` and `dev-login.spec.tsx`) and drop its import and render from `pages/auth/pages/login/login-page.tsx`; verify the login page still renders the form and `SeededProfiles`
- [x] 3.2 Remove `loginAsDev` from `AuthContextValue` in `pages/auth/auth-context.ts` and its `useCallback` in `pages/auth/auth.context.tsx`; verify `tsc -b` reports every remaining reference
- [x] 3.3 Remove `DEV_KEY`, `writeDevSession`, `isDevSession` and `clearDevSession` from `pages/auth/business/auth-storage.ts`, along with `writeStoredUser`'s call to it and its comment, and simplify `restore()` in `auth.context.tsx` so a missing blob is the whole condition; verify `business/specs/auth-storage.spec.ts` drops its `dev sessions` block and `auth.context.spec.tsx` its dev-session boot test, with the remaining cases unedited
- [x] 3.4 Remove the `DevLogin` quick-entry sentence from the Auth section of `apps/web/.claude/rules/01-project-context.md`; verify no reference to `DevLogin`, `loginAsDev` or `dev-session` remains anywhere under `apps/web`
- [x] 3.5 Run `npm test -w apps/web`, `npm run lint` and `npx prettier --check "src/**/*.{ts,tsx,css}"`, and verify all green

## 4. Cross-cutting verification

- [x] 4.1 Run `npm test` and `npm run build` from the repo root and verify both apps green with the build clean (the pre-existing >500 kB chunk warning aside)
- [x] 4.2 Confirm no backend change was needed by verifying `git diff --stat` touches `apps/web` only, and that `apps/api` is untouched
- [x] 4.3 Run `openspec validate "manager-pizza-sizes" --strict` and verify it still passes after implementation
