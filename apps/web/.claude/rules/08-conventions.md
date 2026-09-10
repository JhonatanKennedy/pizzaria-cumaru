# Project conventions

## 1. Import specifiers: aliases across folders, relative within

This is a bundler project (`moduleResolution: "bundler"`) — import specifiers carry no extension. Top-level folders are imported through `@` aliases (`vite.config.ts` + `tsconfig.app.json` paths): `@components/`, `@pages/`, `@api/`, `@lib/`, `@routes/`. Relative imports are reserved for files inside the same folder tree — the same context's `business/`, `hooks/`, `api/`, `components/` — where the path stays short and readable.

```ts
// ✅ — cross-folder imports go through the alias
import { Button } from '@components/Button';
import { useAuth } from '@pages/auth/use-auth';
import { apiRequest } from '@api/http-client';

// ✅ — inside the same context, relative is shorter and clearer
import { enrichOrder } from '../business/enrich';
import { useOrders } from '../hooks/use-orders';

// ❌ — relative paths that climb out of the folder tree
import { Button } from '../../../../components/Button';

// ❌ — never an extension
import { useAuth } from './use-auth.ts';
```

Careful with the shared kit: `@components/` means `src/components/` only — context components (`pages/<context>/components/`) are imported relatively or via `@pages/<context>/components/`. (The backend repo keeps its `.js`-suffixed NodeNext rule — that's a backend concern; don't copy it here.)

## 2. File naming and the context skeleton

The app is divided into **bounded contexts** under `src/pages/` — one folder per context (`auth`, `waiter`, `kitchen`, `manager`). Everything a context owns lives inside its folder: screens, business rules, API calls, context components and specs. Nothing from a context leaks out — cross-context code goes to the shared top-level folders (`components/`, `api/`, `lib/`), and application assembly lives in `src/routes/`. Files are bare kebab-case; `pages/auth` is the canonical context.

| Kind               | Location                                            | Examples                                    |
| ------------------ | --------------------------------------------------- | ------------------------------------------- |
| Screen             | `pages/<context>/pages/` (folder per screen when it has parts) | `login/login-page.tsx`, `kitchen-page.tsx`  |
| Screen part        | `pages/<context>/pages/<screen>/parts/`              | `LoginForm/index.tsx`, `SeededProfiles/index.tsx` |
| Business rules     | `pages/<context>/business/` (pure TS, no React)      | `role.ts`, `auth.schemas.ts`                |
| Context API module | `pages/<context>/api/`                               | `auth.api.ts`                               |
| Context component  | `pages/<context>/components/`                        | `AccessDenied/index.tsx`                   |
| Context provider   | `pages/<context>/` root                              | `auth.context.tsx` + `auth-context.ts`      |
| Spec               | colocated next to the code under test                | `business/specs/role.spec.ts`, `parts/LoginForm/login-form.spec.tsx` |
| Shared UI kit      | `src/components/`                                    | `Button/index.tsx`, `Card/index.tsx`, `TextField/index.tsx` |
| HTTP seam          | `src/api/http-client.ts`                             | `configureApiClient`, `apiRequest`          |
| App assembly       | `src/routes/`                                         | `router.tsx`, `app.tsx`, `layout/AppLayout/index.tsx` |

**Every component lives in a folder named after the component, and the component itself is `index.tsx`** — `components/Button/index.tsx`, not `components/button.tsx`. When a component grows, its complement files (specs, styles, sub-parts, helpers) sit beside the `index.tsx` in the same folder. This applies to every visual component — UI kit, context components, page parts and the shell. Pages (screens), providers and guards keep their own conventions (`.context.tsx`, `require-role.tsx`).

```
components/
  Button/
    index.tsx
    button.spec.tsx      # when needed
  TextField/
    index.tsx
```

One exported component per file; the context object itself lives in a plain `.ts` (`auth-context.ts`) next to its provider so both stay fast-refresh-safe. `components/`, `api/` and `lib/` import nothing from contexts — when shared code wants context code, it is not shared: move it into the context or into `routes/`.

## 3. Language

Code, identifiers, comments, tests, and the Gherkin specs in `features/` are all in English. **Every user-facing label authored in the frontend — buttons, headings, screen names, form labels, placeholder text, validation messages — is written in Portuguese (pt-BR).** Role display labels are mapped in `pages/auth/business/role.ts` (`Waiter → Garçom`, `Cook → Cozinheiro`, `Manager → Gerente`); screen names follow the same convention (`Waiter Panel → Painel do Garçom`, `Kitchen Panel → Painel da Cozinha`, `Manager Panel → Painel do Gerente`, `Daily Earnings Report → Relatório de Ganhos Diários`).

Two things stay exactly as they come: **backend error messages** are surfaced verbatim, never translated (see §5), and **product data** (menu items, customer names) arrives from the backend as-is.

```tsx
// ❌ — user-facing label in English
<button type="submit">Sign in</button>

// ✅
<button type="submit">Entrar</button>

// ✅ — this stays as it comes from the backend, even in English
<p role="alert">{error.message}</p> // "Invalid username or password"
```

## 4. Format & lint before committing

Prettier (`singleQuote: true`, `trailingComma: "all"`) and oxlint are configured — run `npm run format` and `npm run lint` and keep both passing with zero warnings.

## 5. Error messages

Backend messages are surfaced to the user verbatim via `ApiError.message` (`toErrorMessage` in `lib/errors.ts`) — never rewritten or localized, because the feature specs assert those strings. Local validation messages follow the same short, capitalized style in Portuguese: `'Usuário é obrigatório'`, `'Senha é obrigatória'`.

## 6. Known debt & open questions

- **The http client is the only seam.** `configureApiClient({ getToken, onUnauthorized })` is wired once in `routes/app.tsx`; nothing else in `api/` may touch auth, and no other module-level wiring should be introduced. Components depend on hooks, hooks on `*.api.ts`, api modules on `apiRequest` — tests mock at or above this seam.
- **No e2e suite yet.** The testing rules reserve ~10% for e2e; Playwright + `test/*.e2e-spec.ts` still need to be set up (or explicitly declined).
- **Session in `localStorage`.** JWT + user are stored in `localStorage` for simplicity; it is readable by any script and survives the tab. Revisit (httpOnly cookie or in-memory + refresh) if the app ever leaves the trusted-intranet context.
- **API response schemas cover the read paths, not every endpoint.** The order listings and created-order shapes are validated in shared `@api/orders.api.ts`, the menu catalog (items with `ingredientIds`) in `@api/catalog.api.ts`, and the auth response in `pages/auth`; the orders *mutations* (close, cancel, status PATCH, add/cancel item) and the `/ingredients` + `/kitchen` reads still parse inside their contexts' api modules as those keep being built.
- **`04_delivery_order` is manager-only in the SPA while the Gherkin casts the flow in the waiter's hands** — product decision recorded in the routes table and the 04 mapping row; a reconciliation of the feature file is still open.
- **`09_cancellation_and_payment` has no dedicated context** — its flows (cancel item, split bill) belong inside the waiter order screens and the manager close-order flow (see the mapping in [01-project-context.md](01-project-context.md)).
- **Tailwind v4 has no config file** — brand colors (the red accent) are currently bare utility classes scattered in components; centralize into `@theme` tokens in `src/index.css` when the UI grows past the foundation.
