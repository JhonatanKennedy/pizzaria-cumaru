## Context

The waiter context is a shell: `pages/waiter/` holds a hub page and two placeholders. The foundation gives us the auth-page look (cards, red primary, chips), the `components/` kit (Button, Card, TextField), the `configureApiClient` seam, and the context rules (business/ pure, api/ at the seam, components in folders with `index.tsx`). The backend exposes `GET /items` (with server-computed `available`), `GET /orders` (items carry only `itemId`), `POST /orders`, `POST /orders/:id/items`, `POST /orders/:id/items/:itemId/cancellation`; multi-flavor pricing is computed server-side (max of base and flavor prices). See proposal.md — Why.

## Goals / Non-Goals

**Goals:**

- Tables flow end-to-end inside `pages/waiter`: list → create → detail → add items (category filters) → cancel items.
- Set the pattern every later context copies: business/ (pure, tested), api/ (zod-validated), hooks/ (TanStack Query), components/ (folders with `index.tsx`), pages/ (thin composers).
- Client-side order↔menu enrichment with a graceful fallback for items removed from the menu.

**Non-Goals:**

- No polling/real-time refresh (deferred by product decision; query keys are chosen so `refetchInterval` drops in later).
- No close-order flow (manager-only, manager slice later).
- No delivery screens for the waiter (moves to manager); delivery stays a placeholder in its new home.
- No changes to the backend or to the Gherkin specs.
- No ingredient consultation UI (cook limitation, feature 06 — not a waiter screen).

## Decisions

### D1: Screens and routes

- `/waiter` → redirects to `/waiter/tables` (hub page deleted; a single-destination profile needs no hub).
- `/waiter/tables` → `tables.tsx`: open local orders of the day as `OrderCard`s (table, waiter, item chips with status, total) + `NewTableOrderForm` trigger.
- `/waiter/orders/:orderId` → `order-detail.tsx`: shared by all open orders; header (table + status + total), item list with per-item cancel (with reason), and the `AddItemPanel`. Route makes detail deep-linkable and refreshable.
- *Alternative considered:* detail as drill-in state inside the list page. Rejected: browser refresh loses the screen, and the route is the natural anchor for later kitchen/manager links.

### D2: The add-item panel

`AddItemPanel` owns a single selected item and a form: category chips (fixed order Pizzas | Pratos | Bebidas | Sobremesas | Acompanhamentos, always all five), item grid (Card-sized tiles: name, `formatBRL` price, grayed "Indisponível" when `available === false` — selection blocked), and below the grid, fields for the selected item: quantity (default 1, min 1), flavors (only when `category === PIZZA`, free-text list), notes. Submit calls the add-item mutation and clears selection. Category filter is local UI state — no URL state, no persistence.

- *Alternative considered:* free-text item search instead of chips. Rejected: the menu is small (a pizzeria), and the specs' mental model is menu browsing; chips also double as the availability overview.

### D3: Business layer contents

`pages/waiter/business/` — pure TS, no React, no fetch:

- `schemas.ts` — zod: `menuItemSchema` + `menuListingSchema`, `orderListingSchema` (order + items), `tableOrderFormSchema` (table number required, string), and reused `addItemFormSchema` + `cancelItemFormSchema` (reason required).
- `labels.ts` — `CATEGORY_LABELS` (PIZZA→Pizzas, DISH→Pratos, DRINK→Bebidas, DESSERT→Sobremesas, SIDE→Acompanhamentos), `ORDER_STATUS_LABELS` (Open→Aberta, Closed→Fechada, Preparing→Preparando, Out for delivery→Saiu para entrega, Delivered→Entregue), `ITEM_STATUS_LABELS` (Pending→Pendente, Preparing→Preparando, Ready→Pronto) with fallbacks to the raw value for unknown strings (labels must never crash on a backend change).
- `enrich.ts` — `enrichOrderItems(order, menu)`: joins listing items to the menu by `itemId`; missing catalog entries render name "Item removido do cardápio" and no unit price (the order total still comes from the server, so the screen can show a line total only when the join resolves).

### D4: Data layer

- `catalog.api` — `listMenu()` → `menuListingSchema.parse(await apiRequest('/items'))`.
- `orders.api` — `listOrders()`, `createTableOrder(userId, tableId)`, `addItemToOrder(orderId, payload)`, `cancelOrderItem(orderId, orderItemId, reason)` — each parses/validates at the boundary.
- Hooks in `pages/waiter/hooks/`: `use-menu` and `use-orders` (queries with keys `['menu']` / `['orders']`; `refetchOnWindowFocus: true` so the waiter sees changes when returning to the tab — the later polling work just adds `refetchInterval` to these keys), plus mutation hooks that invalidate `['orders']` on success and surface the backend `message` via `toErrorMessage`.
- `userId` for `POST /orders` comes from the session (`useAuth().user.id`).

### D5: Context components

All in `pages/waiter/components/`, each a folder with `index.tsx` (+ its spec beside it): `OrderCard`, `NewTableOrderForm` (RHF + zod, on submit navigates to the new order detail), `AddItemPanel`, `CancelItemDialog` (reason field, small modal-style Card). The shared kit grows only if something is genuinely cross-context — nothing in this slice is.

### D6: Cancellation (feature 09)

Per item, while `status === 'Pending'`, a cancel action opens `CancelItemDialog` (reason required — backend records it in the order history). Items not Pending get no cancel button (backend rejects in-preparation cancellations).

## Risks / Trade-offs

- [Client-side join shows approximations] — a price changed after ordering shows the new catalog price on the line while the total is the server's snapshot; a deleted item shows the fallback name with no price. Accepted by product decision ("A is enough — small business"); the real fix is enriching `IOrderListingItem` in the backend, noted for later.
- [Unknown status/category strings from the backend] → label fallbacks return the raw value; schemas use `z.string()` for status fields rather than closed enums so an added backend status cannot brick the screen.
- [No polling means stale screens] → `refetchOnWindowFocus` + mutation invalidation cover the waiter's interactions; explicit polling arrives as its own task and only touches query keys.
- [First non-auth context sets the pattern] → mitigated by the business/hooks/components rules already codified; the slice is small enough to review as a whole.

## Open Questions

None — the slice is fully specified above; delivery-in-manager is scoped out of this change beyond the placeholder move.
