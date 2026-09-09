# Project context

`pizzaria-cumaru-frontend` — the web SPA for the pizzeria management system ("Pizzaria Cumaru"). It consumes the REST API of [`pizzaria-cumaru-backend`](../../pizzaria-cumaru-backend/) (NestJS, JWT auth). The product specs live in `features/*.feature` (Gherkin, English) — **read the relevant feature file before building a screen**, and every screen/route should trace back to a scenario there. Remaining debt and open design questions are tracked in [08-conventions.md](08-conventions.md).

## Stack & tooling

| Concern          | Choice                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Language         | TypeScript 6, `strict` (default), `erasableSyntaxOnly` (no TS enums / parameter properties / namespaces)            |
| Framework        | React 19 (function components + hooks only)                                                                          |
| Build tool       | Vite 8 (`@vitejs/plugin-react`)                                                                                      |
| Routing          | React Router 8 — `createBrowserRouter` / `RouterProvider` in `src/routes/router.tsx`                                 |
| Server state     | TanStack Query 5 — one `QueryClient` in `src/routes/query-client.ts`; queries revalidate via `staleTime`             |
| Forms            | React Hook Form 7 + Zod 4 via `@hookform/resolvers` (`zodResolver`)                                                 |
| Styling          | Tailwind CSS 4 via `@tailwindcss/vite` — no `tailwind.config.js`; shared classes (`.field-input`, `.btn-primary`, `.card`) live in `src/index.css` |
| Tests            | Vitest 5 (`globals: true`, jsdom) + Testing Library; `tsconfig.app.json` includes `vitest/globals` in `types`       |
| Lint             | oxlint (`oxlint.json`)                                                                                               |
| Format           | Prettier — `singleQuote: true`, `trailingComma: "all"` (`.prettierrc`)                                              |
| Package manager  | npm                                                                                                                  |

## Commands

| Command         | Purpose                                          |
| --------------- | ------------------------------------------------ |
| `npm run dev`   | Vite dev server (default port 5173)              |
| `npm run build` | `tsc -b` + production build to `dist/`           |
| `npm test`      | Unit + component tests (Vitest, `**/*.spec.tsx?`)|
| `npm run test:watch` | Vitest in watch mode                       |
| `npm run lint`  | oxlint over the repo                             |
| `npm run format`| Prettier write over `src/`                       |
| `npm run preview` | Serve the production build                   |

Environment: `VITE_API_URL` (optional, default `http://localhost:3000`) — see `.env.example`. The backend must be running (`npm run start:dev` there) for any real data; seeded profiles are `ana.gerente` (Manager), `joao.garcom` (Waiter), `carlos.cozinha` (Cook), password `SenhaSegura123`.

## Architecture

DDD-style **bounded contexts**: `src/pages/` holds one folder per context, and every context starts and ends inside its own folder — pages, business rules, API calls, components and specs of a context live together, and nothing from a context leaks out. Cross-context code (the UI kit, the HTTP seam, generic utils) lives in top-level folders, and the application assembly (router, providers, shell) lives in `src/routes/`.

Dependency direction: **`routes/` → `pages/<context>` → `components/` / `api/` / `lib/`**. Contexts may use shared folders but never other contexts; shared folders import nothing from contexts.

```
src/
  pages/              # every context lives here, self-contained
    auth/             # the auth context — the canonical example
      pages/login/    #   a screen: page file + parts/ (each part is a component folder; a page grows a folder
                      #   when it has parts; single-file screens stay single files)
      business/       #   business rules, pure TS, no React: role.ts (role union, home
                      #   paths, pt-BR labels), auth.schemas.ts (form rules + API
                      #   contract), auth-storage.ts (session), handle-unauthorized.ts
      api/auth.api.ts #   backend calls for this context
      components/     #   context-local views (AccessDenied/index.tsx)
      auth.context.tsx, auth-context.ts, use-auth.ts, require-role.tsx  # provider + guards
    waiter/           # waiter context: tables screen + order detail (business, api, hooks, components)
    kitchen/          # kitchen context: the Kitchen Panel
    manager/          # manager context: hub + menu + delivery + daily-earnings screens
  routes/              # application assembly (no app/ folder)
    app.tsx           # configureApiClient wiring + QueryClientProvider > AuthProvider > RouterProvider
    router.tsx        # createBrowserRouter — every route, with its role guard
    layout/AppLayout/index.tsx  # the app shell (nav by role, user chip, logout)
    home-redirect.tsx, not-found-page.tsx, query-client.ts
  components/         # shared UI kit only: Button/, Card/, TextField/, FeaturePlaceholder/ (each with index.tsx)
  api/http-client.ts  # the HTTP seam: fetch wrapper, ApiError, configureApiClient
                      # api/catalog.api.ts — shared catalog contract (schemas, endpoints,
                      # query keys) consumed by the waiter and manager contexts
                      # api/tables.api.ts — shared tables contract (floor listing + query key)
  lib/                # toErrorMessage, formatBRL
  main.tsx            # bootstrap
  index.css           # Tailwind import + shared component classes
  env.d.ts            # ImportMetaEnv typing
```

### The API contract (backend shapes)

- **Errors** — the backend's `DomainErrorFilter` returns `{ statusCode, message }` with a non-2xx status. `apiRequest` throws `ApiError(statusCode, message)`; display `message` to the user as-is (no localization — the specs assert these exact strings, e.g. `"Invalid username or password"`, `"Account locked. Try again in 15 minutes"`).
- **Responses are validated before use** — `apiRequest` returns `unknown`; every `*.api.ts` parses with a zod schema (`loginResponseSchema.parse(data)`). A backend shape change becomes a loud error at the point of use, not a silent bug deep in a component.
- **401 handling** — the client knows nothing about auth. `routes/app.tsx` wires `configureApiClient({ getToken: readToken, onUnauthorized: handleUnauthorized })` once; on 401 the client calls `onUnauthorized`, which clears storage and resets the `AuthProvider` user (via the expiry handler the provider registers), and `RequireRole` redirects to `/login`.

### Auth

JWT from `POST /auth/login` (`{ login, password }` → `{ token, user: { id, login, role } }`), stored in `localStorage` (`pizzaria-cumaru.token` / `pizzaria-cumaru.user`) via `pages/auth/business/auth-storage.ts` — read back through type guards, never cast. Every request sends `Authorization: Bearer <token>`. Roles are the literal union `Waiter | Cook | Manager` (`pages/auth/business/role.ts`); role → home screen mapping lives there too (`Manager → /manager`, `Waiter → /waiter`, `Cook → /kitchen`). Route protection: `<RequireRole roles={...}>` (unauthenticated → `/login`; wrong role → `AccessDenied` with the spec'd message) and `<GuestOnly>` for `/login`. In development only (`import.meta.env.DEV`), the login page renders a `DevLogin` quick-entry that writes a fake session per role without calling the backend — data screens still need the real backend.

### Routes

| Route                     | Roles            | Feature file               | Status              |
| ------------------------- | ---------------- | -------------------------- | ------------------- |
| `/login`                  | public           | `01_authentication`        | ✅ working          |
| `/waiter`                 | Waiter, Manager  | `05_waiter_profile`        | redirects to `/waiter/tables` |
| `/waiter/tables`          | Waiter, Manager  | `03_table_order`           | ✅ working          |
| `/waiter/orders/:orderId` | Waiter, Manager  | `03_table_order`, `09`     | ✅ working          |
| `/kitchen`                | Cook, Manager    | `06_cook_profile`          | placeholder         |
| `/manager`                | Manager          | `07_manager_profile`       | placeholder (hub)   |
| `/manager/menu`           | Manager          | `02_menu_and_stock`        | ✅ working          |
| `/manager/delivery`       | Manager          | `04_delivery_order`        | placeholder         |
| `/reports/daily-earnings` | Manager          | `07_manager_profile`       | placeholder         |

The role matrix mirrors the backend's `RolesGuard`: waiters and managers share the order flows; cooks and managers share the kitchen; manager-only for management and reports. Delivery is a manager-only flow by product decision (the Gherkin specs still describe it in the waiter's hands — to be reconciled).

### Feature-file mapping

One context per product area — the folder is the context, and each screen names its spec:

| Feature file                  | Context                        | Notes                                                                                   |
| ----------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `01_authentication.feature`   | `pages/auth`                   | Login form (RHF + Zod), role-based redirect, logout, guards. Implemented — the canonical context. |
| `02_menu_and_stock.feature`   | `pages/manager`                | Items and ingredients tabs implemented (create/edit/price/delete, stock toggles). Link/unlink ingredient↔item deferred — `GET /items` does not expose `ingredientIds`. |
| `03_table_order.feature`      | `pages/waiter`                 | Floor view (free/occupied tables from `GET /tables`), order detail, add items with flavors and notes, per-row quantity adjustment (`+`/`−`, works while the item is in preparation), whole-order cancellation with reason. Implemented. |
| `10_table_management.feature` | `pages/waiter` + `pages/manager` | Floor view implemented; the manager's table CRUD screen (register/renumber/remove) is still pending. |
| `04_delivery_order.feature`   | `pages/manager`                | Delivery orders; status cycle to Delivered. Placeholder.                                |
| `05_waiter_profile.feature`   | `pages/waiter`                 | Tables screen with preparation-status follow-up; waiter cannot close orders.            |
| `06_cook_profile.feature`     | `pages/kitchen`                | Two queues by arrival order; start/finish/cancel preparation.                           |
| `07_manager_profile.feature`  | `pages/manager`                | Manager hub, daily-earnings report, close-order flow with payment type.                 |
| `09_cancellation_and_payment.feature` | `pages/waiter` + `pages/manager` | Item and whole-order cancellation with reason implemented in the waiter order detail (a cancelled order renders read-only as "Cancelado" and frees its table); split bill remains in the manager close-order flow. |

## Feature specs

`features/*.feature` are the product specs — one file per flow (`01_authentication` through `09_cancellation_and_payment`, no `08`). Screens, routes, user-visible messages and component tests should trace back to scenarios in these files. If you can't name the scenario a screen implements, the screen doesn't belong.
