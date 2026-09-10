## Context

The foundation is feature-based but half-committed (see proposal.md — Why). Current shape and the two structural smells:

```
src/
  app/                 # glue — clean
  features/auth/       # context, guards, form, page, schemas, api   ┐
  shared/auth/         # role.ts, auth-storage.ts, role.spec.ts      ┘ one concept, two roots
  shared/components/app-layout.tsx  ──imports──▶ features/auth/use-auth   ← violates the rule
```

Hard constraint: dependency direction `app → features → shared`, and `shared` imports nothing from `features`. The test suite (11 tests), `tsc -b` and oxlint are the safety net for every move.

## Goals / Non-Goals

**Goals:**

- One canonical internal skeleton per feature module, visible from day one.
- `shared/` free of feature imports — the dependency rule becomes *true*, not aspirational.
- A single, inverted seam between the app and the backend (the http client).
- The rules docs describe the structure that actually exists.

**Non-Goals:**

- No UI, route, role-matrix, message or behavior changes of any kind.
- No backend changes, no new dependencies.
- No frontend domain layer (entities mirroring backend aggregates) — the backend owns business rules.
- No Tailwind theme token centralization — separate debt, untouched.

## Decisions

### D1: Feature slices as the only organizing principle

Keep the vertical feature modules and *deepen* them; do not introduce horizontal layers (`pages/ hooks/ api/` at root) and do not add a clean-architecture domain layer. The backend is authoritative for business rules; frontend entities would be anemic mirrors that drift. Horizontal layers are exactly the "all over the place" symptom: a feature's small units (form, fetch, schema) spread across five roots.

- *Alternative considered:* mirror the backend's controller → use-case → domain layering with frontend entity classes. Rejected: duplicated business rules to keep in sync, and React hooks + TanStack Query make class-based use-cases unidiomatic.
- *What survives from SOLID:* S — one module, one job (schemas ≠ api ≠ UI); D — components depend on hooks, hooks on api modules, api modules on the client (the single mockable seam).

### D2: All auth lives in `features/auth`

`role.ts`, `auth-storage.ts` and `role.spec.ts` move from `shared/auth/` into `features/auth/`. The feature exports what the rest of the app needs (`AuthProvider`, `useAuth`, `RequireRole`, `GuestOnly`, role helpers). `shared/` retains only `api/`, `components/` (feature-placeholder) and `lib/`.

- *Alternative considered:* keep a minimal `shared/auth` holding only storage. Rejected: it recreates the split and is what allowed the rule violation in the first place.

### D3: Invert the client's auth dependency via `configureApiClient`

`apiRequest` currently imports `readToken`/`clearSession` from storage and dispatches a `window` event on 401. After the refactor that import would violate the rule, so the client stops knowing about auth entirely:

```ts
// shared/api/http-client.ts — depends on an abstraction, nothing else
interface ApiClientConfig {
  getToken: () => string | null;
  onUnauthorized: () => void;
}
export function configureApiClient(config: ApiClientConfig): void;

// app/app.tsx — wires the implementation once, before first render
configureApiClient({ getToken: readToken, onUnauthorized: clearSession });
```

The `UNAUTHORIZED_EVENT` window event is removed: `AuthProvider` currently listens to it, but with `onUnauthorized` the provider can be told directly to clear state (the config call in `app.tsx` can also reset the provider via a registered callback, keeping a single wiring point). The callbacks are typed, synchronous and trivially mockable — a better seam than a global event.

- *Alternative considered:* keep the client importing storage and accept the rule violation. Rejected — the whole point of the change.
- *Alternative considered:* pass the token per call from every api module. Rejected: leaks auth concerns into every feature.
- *Trade-off:* module-level singleton config. Acceptable for a single-API SPA; revisit only if a second backend or multi-tenant client appears.

### D4: Canonical per-feature skeleton, `*.page.tsx` suffix dropped

Every feature module starts with the same folders: `pages/`, `api/`, `schemas/`, `components/`, `hooks/`, `specs/` — empty folders appear only when the feature grows into them, but `pages/` exists everywhere from day one. Pages become `pages/login.tsx`, `pages/kitchen-panel.tsx`; the `.page` suffix is redundant inside `pages/` and is removed. Specs live in `specs/` with the same names they have today.

- *Alternative considered:* keep flat feature folders with suffixes. Rejected: the pattern stays invisible until a feature has 8+ files, which is the current state.
- *Alternative considered:* one-folder-per-component nesting. Rejected: too deep for single-file pages.

### D5: The app shell lives at `app/`

`app-layout.tsx` moves to `app/layout/` and takes `NAV_LINKS` (role policy) with it. It imports the auth feature — which is legal at the app level — so no rule bends needed. `access-denied.tsx` moves to `features/auth/components/` (it is auth UI).

### D6: Reorganize move-by-move, verifying after each step

Each task moves one concept (storage, role, guards, shell, placeholders) and then runs `npm test`, `npm run lint` and `tsc -b` before the next. No "big bang" move-and-fix-at-the-end.

## Risks / Trade-offs

- [Import churn introduces a silent regression] → per-task verification (tests + type-check + lint); the suite already covers the auth flows end-to-end at the module level.
- [Architecture rules live only in `.claude/rules/`, since specs are skipped] → accepted: rules are the source of truth for code conventions here; promoting the architecture to an OpenSpec capability would be a separate change if ever wanted.
- [Slightly deeper paths inside features] → mitigated by a shallow skeleton (one level, one file per page); deeper nesting only when a feature's own components grow.
- [Global client config is a singleton] → acceptable for a single-backend SPA; noted in the code contract if a second API appears.
- [Rules docs and code can drift again] → the rules' debt section will name this change as the enforcement point; review gates keep them honest.

## Migration Plan

- Pure source reorg in one branch; no env, data or dependency changes; the dev server and build work unchanged.
- Rollback: revert the commit range — nothing else is affected.
- Deploy: whenever green; no user-visible change to announce beyond internal paths.

## Open Questions

None — the task breakdown follows directly from D1–D6.
