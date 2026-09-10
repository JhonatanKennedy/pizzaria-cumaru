## 1. Invert the http client seam

- [x] 1.1 Replace the client's direct auth imports with `configureApiClient({ getToken, onUnauthorized })` (D3): `shared/api/http-client.ts` keeps `apiRequest` and `ApiError`, drops `readToken`/`clearSession` imports and the `UNAUTHORIZED_EVENT` dispatch, and calls the configured callbacks instead. Rewire `features/auth` to export `handleUnauthorized` (clears storage + resets provider state via a setter registered by `AuthProvider`), remove the window-event listener from `auth.context.tsx`, and wire `configureApiClient({ getToken: readToken, onUnauthorized: handleUnauthorized })` once in `app/app.tsx`. Verify: `npm test`, `npm run lint` and `npm run build` all green.

## 2. Consolidate auth into features/auth

- [x] 2.1 Move `shared/auth/role.ts` and its `role.spec.ts` into `features/auth/` (D2); update every importer (auth-context, use-auth, require-role, login-form, app-layout, router). Verify: `npm test`, `npm run lint`, `npm run build` green; `grep -rn "shared/auth" src/` returns nothing.
- [x] 2.2 Move `shared/auth/auth-storage.ts` into `features/auth/`; update importers (auth.context, the wiring in app.tsx). Verify: tests, lint, build green; no `shared/auth` references remain.
- [x] 2.3 Move `shared/components/access-denied.tsx` into `features/auth/components/` (D5); update `require-role.tsx`. Verify: tests, lint, build green.
- [x] 2.4 Reorganize `features/auth` into the canonical skeleton (D4): `pages/login.tsx`, `components/login-form.tsx`, `components/require-role.tsx`, `components/access-denied.tsx`, `api/auth.api.ts`, `schemas/auth.schemas.ts`, `hooks/use-auth.ts`, `specs/` (role.spec.ts, auth.schemas.spec.ts, login-form.spec.tsx); `auth.context.tsx`, `auth-context.ts`, `role.ts`, `auth-storage.ts` stay at the module root. Update all internal and external import paths (router, app-layout, app.tsx). Verify: tests, lint, build green.

## 3. Move the app shell to app/

- [x] 3.1 Move `shared/components/app-layout.tsx` (with `NAV_LINKS`) into `app/layout/` (D5); update the router import. Verify: tests, lint, build green.

## 4. Apply the skeleton to the placeholder features

- [x] 4.1 Move each placeholder into `pages/` and drop the `.page` suffix (D4): `waiter-panel/pages/waiter-panel.tsx`, `table-order/pages/table-order.tsx`, `delivery-order/pages/delivery-order.tsx`, `kitchen-panel/pages/kitchen-panel.tsx`, `manager-panel/pages/manager-panel.tsx` + `pages/daily-earnings.tsx`, `menu-stock/pages/menu-stock.tsx`. Update router imports. Verify: tests, lint, build green; `find src -name "*.page.tsx"` returns nothing.

## 5. Sync the rules docs

- [x] 5.1 Update `.claude/rules/01-project-context.md`: structure tree, per-feature skeleton, auth consolidation, `configureApiClient` seam, and updated file paths in the feature-mapping table. Verify: paths in the doc match `find src -type f`.
- [x] 5.2 Update `.claude/rules/08-conventions.md`: file-naming table (drop `*.page.tsx`, add `pages/`, `components/`, `api/`, `schemas/`, `hooks/`, `specs/`), replace the scattered-auth debt items with the client-seam contract, and note the enforcement point. Verify: `grep -rn "\.page\.tsx\|shared/auth" .claude/rules/` returns nothing.

## 6. Final verification

- [x] 6.1 Run `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and smoke-check the dev server serves `/login`. Verify: all commands pass; the app boots.
