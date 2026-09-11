# Project context

`apps/web` — the web SPA for the pizzeria management system ("Pizzaria Cumaru"), formerly the standalone `pizzaria-cumaru-frontend` repo. It consumes the REST API of [`apps/api`](../../../apps/api/) (NestJS, JWT auth). The product specs live in the repo-root `features/*.feature` (Gherkin, English) — **read the relevant feature file before building a screen**, and every screen/route should trace back to a scenario there. Remaining debt and open design questions are tracked in [08-conventions.md](08-conventions.md).

## Stack & tooling

| Concern         | Choice                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript 6, `strict` (default), `erasableSyntaxOnly` (no TS enums / parameter properties / namespaces)                                           |
| Framework       | React 19 (function components + hooks only)                                                                                                        |
| Build tool      | Vite 8 (`@vitejs/plugin-react`)                                                                                                                    |
| Routing         | React Router 8 — `createBrowserRouter` / `RouterProvider` in `src/routes/router.tsx`                                                               |
| Server state    | TanStack Query 5 — one `QueryClient` in `src/routes/query-client.ts`; queries revalidate via `staleTime`                                           |
| Forms           | React Hook Form 7 + Zod 4 via `@hookform/resolvers` (`zodResolver`)                                                                                |
| Styling         | Tailwind CSS 4 via `@tailwindcss/vite` — no `tailwind.config.js`; shared classes (`.field-input`, `.btn-primary`, `.card`) live in `src/index.css` |
| Tests           | Vitest 5 (`globals: true`, jsdom) + Testing Library; `tsconfig.app.json` includes `vitest/globals` in `types`                                      |
| Lint            | oxlint (`.oxlintrc.json`)                                                                                                                          |
| Format          | Prettier — `singleQuote: true`, `trailingComma: "all"` (`.prettierrc`)                                                                             |
| Package manager | npm                                                                                                                                                |

## Commands

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Vite dev server (default port 5173)               |
| `npm run build`      | `tsc -b` + production build to `dist/`            |
| `npm test`           | Unit + component tests (Vitest, `**/*.spec.tsx?`) |
| `npm run test:watch` | Vitest in watch mode                              |
| `npm run lint`       | oxlint over the repo                              |
| `npm run format`     | Prettier write over `src/`                        |
| `npm run preview`    | Serve the production build                        |

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
    kitchen/          # kitchen context: the Kitchen Panel (api, hooks, components, screen)
    manager/          # manager context: board + menu + delivery + tables + day reports
                      #   (business/ service-status (the sentences) + service-overview (the
                      #   board's lines) + destinations (the rail) + labels, sales + delivery
                      #   rules; api/ reports, daily-sales, delivery-orders;
                      #   components/ManagerNav; pages/daily-earnings and pages/delivery,
                      #   each with parts/)
  routes/              # application assembly (no app/ folder)
    app.tsx           # configureApiClient wiring + QueryClientProvider > AuthProvider > RouterProvider
    router.tsx        # createBrowserRouter — every route, with its role guard
    order-detail-route.tsx      # loads the order by :orderId, then renders the shared OrderDetailPage
    layout/AppLayout/index.tsx  # the app shell (brand home link, user chip, logout) and,
                                # for a Manager, the rail beside whatever is routed
    home-redirect.tsx, not-found-page.tsx, query-client.ts
  components/         # shared UI kit only: Button/, Card/, TextField/,
                      # FlavorComposer/, Skeleton/, LoadingRegion/, Chip/, SearchField/
                      # (each with index.tsx)
  api/http-client.ts  # the HTTP seam: fetch wrapper, ApiError, configureApiClient
                      # api/catalog.api.ts — shared catalog contract (schemas, endpoints,
                      # query keys) consumed by the waiter and manager contexts
                      # api/tables.api.ts — shared tables contract (floor listing + query key)
                      # api/orders.api.ts — shared orders listing contract (schemas, listOrders,
                      # query key) consumed by the waiter order screens and the manager delivery screens
  lib/                # toErrorMessage, formatBRL + formatTime + formatElapsed, catalog.ts
                      # (shared menu contract),
                      # item-labels.ts (item status labels), kitchen-item.ts (the kitchen's open
                      # item statuses), order-labels.ts (order status labels),
                      # payment-labels.ts (payment type labels), order-enrich.ts (order + menu join),
                      # flavor-composition.ts (pizza flavor parts + fatia canvas)
                      # — shared when a second context consumes the rule
  main.tsx            # bootstrap
  index.css           # Tailwind import + shared component classes + @theme tokens (item status fills)
  env.d.ts            # ImportMetaEnv typing
  test/setup.ts       # the single global test setup (jest-dom matchers), wired in vite.config.ts
```

### The API contract (backend shapes)

- **Errors** — the backend's `DomainErrorFilter` returns `{ statusCode, message }` with a non-2xx status. `apiRequest` throws `ApiError(statusCode, message)`; display `message` to the user as-is (no localization — the specs assert these exact strings, e.g. `"Invalid username or password"`, `"Account locked. Try again in 15 minutes"`).
- **Responses are validated before use** — `apiRequest` returns `unknown`; every `*.api.ts` parses with a zod schema (`loginResponseSchema.parse(data)`). A backend shape change becomes a loud error at the point of use, not a silent bug deep in a component.
- **401 handling** — the client knows nothing about auth. `routes/app.tsx` wires `configureApiClient({ getToken: readToken, onUnauthorized: handleUnauthorized })` once; on 401 the client calls `onUnauthorized`, which clears storage and resets the `AuthProvider` user (via the expiry handler the provider registers), and `RequireRole` redirects to `/login`.

### Loading and failure states

A screen waiting on a read shows a **skeleton of the shape it is about to become**, never a bare line of text. `Skeleton` draws one decorative block, sized by the caller's `className`; `LoadingRegion` wraps a set of them and carries the single `Carregando…` a screen reader needs — the blocks themselves are `aria-hidden`, so the region is the only thing announced, once per screen.

Compose the silhouette **inline in the screen's loading branch, next to the real markup** — that is what keeps the two in sync. There is deliberately no generic `<ListSkeleton rows={n}>`: a generic shape matches no screen exactly.

- **The frame renders; only the content region skeletons.** A back link, a screen title, the kitchen's "Entrega"/"Local" headings and the menu's Itens/Ingredientes tabs are literals or local state, not payload — they are drawn while the data loads, so the page never blanks and nothing jumps when it arrives.
- **Key the skeleton off `isPending`, never `isFetching`.** `useKitchenQueue` polls every 15s; a background refetch must not blank or flicker the screen. The same split applies to a manual action: `Atualizar` swaps its label for the tap the user just made, not for a poll.
- **Only the kitchen polls.** The manager context reads nothing on an interval — the panel is open all shift, and a 15s poll on three endpoints is a standing bill for data nobody is watching. Its screens refresh on window focus, on the mutations they fire themselves, and on the hub's `Atualizar`; the hub reports `Atualizado às HH:MM` (the oldest of its three reads) so the manager can see how stale the board is. The ages on the board still move, on a tick that re-renders and requests nothing.
- **Mutations keep the label-swap convention** (`'Salvando…'`, `'Abrindo…'`, `'Confirmando…'`) and disable their control while the request is in flight, so a second tap cannot fire a second request. `ConfirmDialog` does that once for every destructive action in the manager context; where a label is impossible (the icon-only `QuantityStepper`) the count carries the pending state instead.
- **Retry is not universal.** Only `kitchen-panel`, `daily-earnings-report` and `daily-sales` require a retry path and all three have one; the other screens recover on window focus, or on the poll where their read has one. And **a line whose read failed says why, in the place its state sentence would have been** — an area with nothing happening and an area with no data look identical, and only one of them is the truth.

### Search and filters

Every list that is long enough to scan by eye carries its own search, and the rule lives once in `lib/`.

- **`SearchField` is the only search input.** `lib/search.ts` folds case and accents before comparing (`normalizeForSearch` / `matchesSearch`), so `acai` finds `Açaí` and `CALABRESA` finds `Calabresa`; `lib/catalog.ts`'s `filterCatalogItems` composes a name query with a category for the three surfaces that narrow the same menu. A screen that wants a different rule spells it in `lib/`, not inline in JSX.
- **`Chip` is the only filter control.** A chip toggles what a list shows (`aria-pressed`, pill); a `Button` issues a command. They are separate components because they carry separate ARIA. Navigation between two views of a screen is a tab bar (`MenuTabs`), never a pill — the pill means "narrow this", and a pill-shaped switcher reads as one more filter.
- **Narrowing composes, and a dead end offers a way out.** A name query and a category both apply, so a search that matches nothing _within_ the picked category says which two things it combined — `` `Nenhum item em Pizzas para "suco".` `` — and offers `Buscar em todas as categorias` right there. The escape only appears when clearing the category is what would help; a query that matches nothing anywhere gets the sentence and no button.
- **A filtered list states its total.** `formatCount` renders `"20 itens"` unfiltered and `"3 de 20 itens"` once a filter is on — a bare `"3 itens"` reads as a catalogue that lost its items.
- **The empty state teaches the interface**, and names the action: `'Nenhum item no cardápio. Use "Novo item" para cadastrar o primeiro.'` is an empty catalogue inviting the first entry, and it is a different sentence from a search that found nothing.
- **A list that holds records is a table**, one row per record, with a `th[scope="row"]` naming it. Repeated row actions are `variant="outline"` — a solid brand fill per row is a wall of red that drowns the data beside it. A pill inside a row means "there is something to notice here" (`Indisponível`, `Ocupada`); the resting state is plain muted text.

### Auth

Two halves, and neither is a session on its own. `POST /auth/login` (`{ login, password }` → `{ accessToken, user: { id, login, role } }`) returns a **15-minute access token** that `pages/auth/business/session.ts` keeps in a **module variable** — memory only, so nothing is left behind for a later script to pick up — and sets a **12-hour refresh token** in the httpOnly cookie `refresh_token` (`Path=/auth`, `SameSite=lax`, `secure` only when `NODE_ENV=production`). `pages/auth/business/auth-storage.ts` stores **only the user blob**, under `pizzaria-cumaru.user`; read back through type guards, never cast.

A boot that finds a blob but no cookie is therefore _not_ a session: `AuthProvider` starts at `status: 'pending'`, renders a skeleton **instead of** `RouterProvider`, and calls `POST /auth/refresh` — which is also what makes a reload keep working. Rotation is **single-use**: every refresh denies the token it replaced (`DeniedToken`), and `refreshAccessToken()` funnels concurrent callers through one in-flight promise so five screens firing at once cannot spend the same token four times over. A refused refresh clears the blob and drops the user, and `RequireRole` redirects to `/login`. Every request sends `Authorization: Bearer <token>` through the `configureApiClient` seam.

Roles are the literal union `Waiter | Cook | Manager` (`pages/auth/business/role.ts`); role → home screen mapping lives there too (`Manager → /manager`, `Waiter → /waiter`, `Cook → /kitchen`). Route protection: `<RequireRole roles={...}>` (unauthenticated → `/login`; wrong role → `AccessDenied` with the spec'd message) and `<GuestOnly>` for `/login`. Every session comes from `POST /auth/login`; there is no way to obtain one that skips the backend, in development or otherwise. The login page lists the seeded logins (`SeededProfiles`) in development only, behind `import.meta.env.DEV` — the seed is a local fixture, so a production build must not name accounts its deployment does not have.

### Routes

| Route                        | Roles           | Feature file           | Status                                                                                                                                          |
| ---------------------------- | --------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                     | public          | `01_authentication`    | ✅ working                                                                                                                                      |
| `/waiter`                    | Waiter, Manager | `05_waiter_profile`    | redirects to `/waiter/tables`                                                                                                                   |
| `/waiter/tables`             | Waiter, Manager | `03_table_order`       | ✅ working                                                                                                                                      |
| `/waiter/orders/:orderId`    | Waiter, Manager | `03_table_order`, `09` | ✅ working (manager-only "Fechar conta", gated while items are in preparation)                                                                  |
| `/kitchen`                   | Cook, Manager   | `06_cook_profile`      | ✅ working                                                                                                                                      |
| `/manager`                   | Manager         | `07_manager_profile`   | ✅ working (a board: salão, cozinha, entregas, cardápio — each line its state and the record waiting longest, each name a door into its screen) |
| `/manager/menu`              | Manager         | `02_menu_and_stock`    | ✅ working                                                                                                                                      |
| `/manager/delivery`          | Manager         | `04_delivery_order`    | ✅ working                                                                                                                                      |
| `/manager/delivery/:orderId` | Manager         | `04_delivery_order`    | ✅ working (advance to Delivered)                                                                                                               |
| `/manager/tables`            | Manager         | `10_table_management`  | ✅ working (register/renumber/remove with confirmation and verbatim refusals)                                                                   |
| `/reports/daily-earnings`    | Manager         | `07_manager_profile`   | ✅ working (earnings totals + the day's sales list with filters)                                                                                |

The role matrix mirrors the backend's `RolesGuard`: waiters and managers share the order flows; cooks and managers share the kitchen; manager-only for management and reports. Delivery is a manager-only flow by product decision (the Gherkin specs still describe it in the waiter's hands — to be reconciled).

### Feature-file mapping

One context per product area — the folder is the context, and each screen names its spec:

| Feature file                          | Context                          | What the spec covers                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_authentication.feature`           | `pages/auth`                     | Login form, role-based redirect, logout, guards. The canonical context.                                                                                                                                                                                                                                                                                                |
| `02_menu_and_stock.feature`           | `pages/manager`                  | Menu tab: items + ingredients, and the item↔ingredient link. Rules: a kitchen-category item must carry "Exige preparo" (refused with `Pizzas e pratos exigem "Exige preparo"`), and an out-of-stock ingredient makes its items unavailable across every surface.                                                                                                       |
| `03_table_order.feature`              | `pages/waiter`                   | Floor view, order detail, add items with flavors and notes, per-row quantity (works while the item is in preparation), item and whole-order cancellation.                                                                                                                                                                                                              |
| `10_table_management.feature`         | `pages/waiter` + `pages/manager` | Waiter floor view; manager CRUD at `/manager/tables` (Livre/Ocupada from the open order).                                                                                                                                                                                                                                                                              |
| `04_delivery_order.feature`           | `pages/manager`                  | Manager-only delivery: list, create dialog, detail with one advance action per step until Delivered. No local required rules — the backend's rejections surface verbatim.                                                                                                                                                                                              |
| `05_waiter_profile.feature`           | `pages/waiter`                   | Tables screen with preparation follow-up; the waiter cannot close orders.                                                                                                                                                                                                                                                                                              |
| `06_cook_profile.feature`             | `pages/kitchen`                  | Kitchen Panel: anonymous tiles in the server's arrival order, start/finish, cancel-preparation, 15s auto-refresh.                                                                                                                                                                                                                                                      |
| `07_manager_profile.feature`          | `pages/manager`                  | Manager board (the four parts of the service as four lines — state plus the record waiting longest — each line's name leading into its screen), under a rail that follows the manager onto every screen they can reach; daily report (earnings totals + the "Vendas do Dia" list); close-order with payment type on the shared order detail. Split bill still pending. |
| `09_cancellation_and_payment.feature` | `pages/waiter` + `pages/manager` | Cancellation and payment across the waiter order detail and the manager close-order flow.                                                                                                                                                                                                                                                                              |

## Feature specs

The repo-root `features/*.feature` are the product specs — one file per flow (`01_authentication` through `10_table_management`, no `08`). Screens, routes, user-visible messages and component tests should trace back to scenarios in these files. If you can't name the scenario a screen implements, the screen doesn't belong.
