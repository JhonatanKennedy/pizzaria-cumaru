## Why

The frontend foundation works but its architecture is half-committed: the auth concept is split across two roots (`features/auth` and `shared/auth`), the "shared never imports features" rule is already violated (`shared/components/app-layout.tsx` imports `features/auth`), and feature modules have no canonical internal shape — 8 files in `auth`, one placeholder elsewhere. Fix it now, before the waiter, kitchen and manager screens pile onto the skeleton.

## What Changes

- Consolidate all auth code into `features/auth` — role union, session storage, guards, access-denied UI, and their specs. One concept, one home. **BREAKING** for internal import paths only; no user-visible behavior changes.
- Move the app shell (`app-layout.tsx`) from `shared/components/` to `app/layout/` — it is app-level UI that depends on the auth feature, and moving it makes the dependency rule true: `shared/` imports nothing from `features/`.
- Invert the http client's auth dependency: `apiRequest` no longer imports session storage directly; instead `configureApiClient({ getToken, onUnauthorized })` is wired once at app bootstrap, with the auth feature supplying the callbacks. The client depends on an abstraction; tests get a real seam. **BREAKING** for internal modules only.
- Introduce the canonical per-feature skeleton — `pages/`, `api/`, `schemas/`, `components/`, `hooks/`, `specs/` — applied to every feature module. Placeholder screens move into `pages/`. The `*.page.tsx` suffix is dropped (the folder says it).
- Update `.claude/rules/01-project-context.md` and `.claude/rules/08-conventions.md` to describe the consolidated structure, naming, and the client seam; retire the "auth scattered across roots" debt items.
- No user-visible behavior change: same routes, same screens, same messages. The existing test suite (11 tests) must stay green throughout and `npm run lint` / `tsc -b` stay clean after each move.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — this is a pure structural refactor. Spec-level behavior (routes, screens, messages) is unchanged, so `skip_specs: true` is set on this change.

## Impact

- `src/` — approximately 25 files moved or rewritten across `app/`, `features/`, `shared/`; all internal import paths updated.
- `.claude/rules/` — `01-project-context.md`, `08-conventions.md` restructured sections.
- No backend changes, no dependency changes, no route or role-matrix changes.
- Risk: import churn introducing regressions — mitigated by moving file-by-file with the test suite, lint and type-check running green at each step.
