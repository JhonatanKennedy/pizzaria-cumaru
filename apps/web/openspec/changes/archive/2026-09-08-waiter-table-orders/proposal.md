## Why

The waiter context is the first real feature slice after the foundation: the waiter's daily job is registering table orders, adding items and following preparation status. This slice builds that flow end-to-end inside the `pages/waiter` context, exercising every layer (business, api, hooks, components, pages) so the pattern it sets is the one the kitchen and manager contexts copy.

## What Changes

- **New screens in `pages/waiter`**: tables list (open orders of the day as cards with items, statuses and totals), order detail at route `/waiter/orders/:orderId` (item list with status chips + add-item panel + per-item cancellation), and a new-table-order form. `/waiter` now redirects straight to `/waiter/tables` — the hub page is removed.
- **Add-item panel with category filters**: chips for Pizzas | Pratos | Bebidas | Sobremesas | Acompanhamentos; items render as small cards with price and a grayed "Indisponível" state (availability comes from the backend). Pizza items get a flavors field (multi-flavor pricing is computed server-side); all items get quantity and notes.
- **Business layer in `pages/waiter/business/`**: zod schemas (menu listing, orders listing, table-order form), pt-BR labels for categories and order/item statuses, and the order↔menu enrichment (client-side join — the day's orders list items by `itemId` only; deleted menu items render as "Item removido do cardápio").
- **API + hooks**: `catalog.api` (GET /items), `orders.api` (GET /orders, POST /orders, POST /orders/:orderId/items, POST /orders/:orderId/items/:itemId/cancellation), and query/mutation hooks (`use-menu`, `use-orders`, `use-create-table-order`, `use-add-item`, `use-cancel-item`). No polling — data loads on entry and refetches on mutation/window focus.
- **Delivery moves to the manager context** (product decision: only the manager handles delivery). The `pages/waiter` delivery placeholder moves to `pages/manager`, its route becomes `/manager/delivery` (Manager only), the manager hub gains a delivery card, and the rules mapping is updated. Note: `features/04_delivery_order.feature` and `05_waiter_profile.feature` still describe delivery in the waiter's hands — the Gherkin specs are not changed here; updating them is a separate product decision.
- **Look and feel**: auth-page aesthetic throughout — stone background, white cards, red primary buttons, badge-style chips.

## Capabilities

### New Capabilities

- `waiter-table-orders`: the waiter's table-order flow — list open table orders, create a table order, add items with category filters/flavors/notes, follow item preparation status, cancel pending items with a reason.

### Modified Capabilities

None.

## Impact

- `pages/waiter/` — pages, components, business, api, hooks (the first non-auth context implementation).
- `pages/manager/` — delivery placeholder moves in; hub gains a card.
- `infra/router.tsx` — new route `/waiter/orders/:orderId`; `/waiter` index redirects to `/waiter/tables`; `/manager/delivery` replaces `/waiter/delivery`.
- `.claude/rules/01-project-context.md` — feature-file mapping: `04_delivery_order` → `pages/manager`.
- Backend: no changes — consumes existing endpoints (`GET /items`, `GET /orders`, `POST /orders`, `POST /orders/:id/items`, cancellation); item names/prices on order lines come from the client-side join, accepted as an interim approximation (see design.md).
