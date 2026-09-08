## 1. Business layer (pure, tested)

- [x] 1.1 Create `pages/waiter/business/labels.ts` — `CATEGORY_LABELS`, `ORDER_STATUS_LABELS`, `ITEM_STATUS_LABELS` in pt-BR with raw-value fallbacks for unknown strings (D3). Verify: colocated spec `labels.spec.ts` covers every known label and the fallback path; `npm test` green.
- [x] 1.2 Create `pages/waiter/business/schemas.ts` — zod schemas for the menu listing, the orders listing, and the table-order/add-item/cancel-item form payloads; status fields as `z.string()` (D4). Verify: spec asserts valid payloads parse and malformed ones fail; `npm test` green.
- [x] 1.3 Create `pages/waiter/business/enrich.ts` — `enrichOrderItems(order, menu)` joining by `itemId`, with name "Item removido do cardápio" and no unit price for missing catalog entries (D3). Verify: spec covers the join, the deleted-item fallback and empty menu; `npm test` green.

## 2. API modules and hooks

- [x] 2.1 Create `pages/waiter/api/catalog.api.ts` — `listMenu()` fetching `/items` and parsing with the menu schema. Verify: `tsc` passes; schema mismatch throws at the boundary.
- [x] 2.2 Create `pages/waiter/api/orders.api.ts` — `listOrders()`, `createTableOrder(userId, tableId)`, `addItemToOrder(orderId, payload)`, `cancelOrderItem(orderId, orderItemId, reason)` against the existing endpoints. Verify: `tsc` passes; payloads match the backend DTOs.
- [x] 2.3 Create `pages/waiter/hooks/use-menu.ts` and `use-orders.ts` — TanStack Query keys `['menu']` / `['orders']` with `refetchOnWindowFocus` (no polling yet, D4). Verify: `tsc` passes.
- [x] 2.4 Create mutation hooks `use-create-table-order.ts`, `use-add-item.ts`, `use-cancel-item.ts` — each invalidates `['orders']` on success and surfaces backend errors via `toErrorMessage`. Verify: `tsc` passes; hooks follow the `use-*` conventions.

## 3. Waiter context components

- [x] 3.1 Create `pages/waiter/components/OrderCard/index.tsx` — table number, waiter name, item chips with status labels, `formatBRL` total; links to the order detail. Verify: component spec renders a card from a listing fixture; `npm test` green.
- [x] 3.2 Create `pages/waiter/components/NewTableOrderForm/index.tsx` — RHF + zod table-number form; on success navigates to `/waiter/orders/:orderId`. Verify: component spec asserts validation error on empty submit and the create call on valid submit; `npm test` green.
- [x] 3.3 Create `pages/waiter/components/AddItemPanel/index.tsx` — five fixed category chips, item tiles (price, "Indisponível" blocking when `available === false`), and selected-item fields (quantity min 1, flavors only for PIZZA, notes) (D2). Verify: component spec covers category filtering, unavailable blocking, and the pizza-only flavors field; `npm test` green.
- [x] 3.4 Create `pages/waiter/components/CancelItemDialog/index.tsx` — reason field (required), confirm/cancel actions; only offered for Pending items (D6). Verify: component spec asserts the reason is required and the cancel call fires; `npm test` green.

## 4. Pages and routing

- [x] 4.1 Create `pages/waiter/pages/tables.tsx` — queries `use-orders` + `use-menu`, renders enriched open local orders as `OrderCard`s and the `NewTableOrderForm`; loading/error states. Verify: screen renders with the dev server; `tsc` passes.
- [x] 4.2 Create `pages/waiter/pages/order-detail.tsx` — route `/waiter/orders/:orderId`; header (table, status, total), enriched item list with per-item status chips and Pending-only cancel via `CancelItemDialog`, and the `AddItemPanel`. Verify: screen renders with the dev server; `tsc` passes.
- [x] 4.3 Update `infra/router.tsx` — `/waiter` index redirects to `/waiter/tables`; add `/waiter/orders/:orderId` (Waiter + Manager); delete the waiter hub page. Verify: `npm test`, `npm run lint`, `npm run build` green; `/waiter` lands on tables.
- [x] 4.4 Move the delivery placeholder `pages/waiter/pages/delivery-page.tsx` → `pages/manager/pages/delivery-page.tsx`; route `/manager/delivery` (Manager only); manager hub gains a delivery card. Verify: lint/test/build green; `/manager` shows the card and `/waiter/delivery` no longer exists.

## 5. Rules sync

- [x] 5.1 Update `.claude/rules/01-project-context.md` — routes table (new `/waiter/orders/:orderId`, `/manager/delivery`, waiter redirect) and feature mapping (`04_delivery_order` → `pages/manager`; `03`/`05`/`09` → `pages/waiter`). Verify: doc paths match `find src -type f`.

## 6. Final verification

- [x] 6.1 Run `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — and smoke-check the dev server serves `/waiter/tables`. Verify: all commands pass; the app boots.
