## 1. Backend listing (sibling repo)

- [x] 1.1 `GET /orders` maps `customerName`/`phone`/`address`/`deliveredAt` into the listing (`src/orders/application/use-cases/list-orders.ts`); new colocated spec covers the delivery and delivered shapes, and the delivery e2e asserts the fields after create and after the `Delivered` transition. Verify: backend gate green.

## 2. Hoists (waiter contracts go shared) — gates green at each stage

- [x] 2.1 `ORDER_STATUS_LABELS`/`orderStatusLabel` move to new `src/lib/order-labels.ts` with their spec; `waiter/business/labels.ts` deleted; the waiter order detail imports the shared module.
- [x] 2.2 New `src/api/orders.api.ts` (pattern of `@api/tables.api.ts`): `ORDERS_QUERY_KEY`, `ORDER_TYPES`/`TOrderType`, order item/listing schemas with the delivery fields `.optional()` (Express drops undefined keys) and `waiterName` `.nullable()`, `createdOrderSchema`, `IAddItemPayload`, `listOrders()`. New `api/orders.api.spec.ts`; the waiter `api/orders.api.ts` keeps its mutations over the shared types and `listOrders` moves to the shared module.
- [x] 2.3 `waiter/business/enrich.ts` moves to `src/lib/order-enrich.ts` with its spec (delivery-field pass-through asserted); the waiter order detail imports it from `@lib`.
- [x] 2.4 Waiter hooks use `ORDERS_QUERY_KEY`; `formatTime` moves from the manager sales card into `src/lib/format.ts` and `SaleCard` consumes it. Verify after each stage: `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — green.

## 3. Manager business rules

- [x] 3.1 `business/delivery-status.ts`: `DELIVERY_STATUSES`/`TDeliveryStatus`, `nextDeliveryStatus` (Open → Preparing → Out for delivery → Delivered; null beyond), `DELIVERY_ACTION_LABELS` per step. Verify: unit spec cycles and nulls.
- [x] 3.2 `business/delivery-schemas.ts`: `createDeliveryOrderFormSchema` without local required rules (backend messages surface verbatim — product decision) plus the manager-local add-item form schema. Verify: unit spec accepts the empty form and rejects a sub-one quantity.

## 4. API + hooks

- [x] 4.1 `api/delivery-orders.api.ts`: `createDeliveryOrder` (POST /orders with `type: 'Delivery'`, parsed through `createdOrderSchema`), `addItemToDeliveryOrder`, `updateDeliveryOrderStatus` (PATCH `/orders/:orderId/status`).
- [x] 4.2 Hooks `use-orders` (15s refetch interval + window-focus refetch, mirroring the kitchen panel), `use-menu`, `use-create-delivery-order`, `use-add-item`, `use-advance-delivery-status` — mutations invalidate `ORDERS_QUERY_KEY`. Verify: `npm run build` passes.

## 5. Screens and router

- [x] 5.1 Replace `pages/manager/pages/delivery-page.tsx` with `pages/delivery/`: `delivery-page.tsx` lists today's delivery orders (loading/error/empty states, "Novo pedido de entrega") over `DeliveryOrderCard` rows; `parts/CreateDeliveryOrderDialog/` (RHF over the form schema, root error verbatim, navigates to the detail on created); `parts/DeliveryOrderCard/` (customer, phone, status chip, total).
- [x] 5.2 `delivery-detail-page.tsx`: order from the shared `['orders']` cache (`Pedido não encontrado.`), enriched via `@lib/order-enrich`; header with customer/phone/address/status/total; "Entregue às \<time\>" when `deliveredAt` is set; the single advance button labeled by `nextDeliveryStatus`, busy while in flight, backend errors verbatim; read-only item lines with `itemStatusLabel`; `parts/AddItemsPanel/` (manager-local rebuild of the waiter panel) only while `Open`.
- [x] 5.3 `router.tsx`: import the new paths and add `/manager/delivery/:orderId` under the Manager `RequireRole`. Verify: `npm run build` passes.
- [x] 5.4 Specs: `business/delivery-status.spec.ts`, `business/delivery-schemas.spec.ts`, `CreateDeliveryOrderDialog` (payload shape incl. trims, verbatim `'Delivery address is required for delivery'`), `AddItemsPanel` (unavailable disabled, flavors/notes, verbatim error), `delivery-page.spec.tsx` (filters locals, empty/error/loading, create → navigate), `delivery-detail-page.spec.tsx` (renders, advances with the next status, verbatim rejection, delivered is final, panel only while open, not-found, loading). Verify: `npm test` green (full suite 205 passing).

## 6. Docs and final gate

- [x] 6.1 Update `.claude/rules/01-project-context.md` (routes table: `/manager/delivery` working + the new `/manager/delivery/:orderId` row; feature-mapping rows 02/04; the manager tree comment) and `08-conventions.md` (the "/orders still needs response schemas" debt bullet — now validated in the shared `@api/orders.api.ts`). Verify: docs match `router.tsx` and the feature mapping.
- [x] 6.2 Record this OpenSpec change (proposal/specs/design/tasks) and run `openspec validate` on both changes.
- [x] 6.3 Final frontend gate: `npx prettier --check src`, `npm run lint`, `npm test`, `npm run build` — all green, zero warnings — plus read-only dev smokes (menu `Ingredientes` dialog state, delivery list/detail rendering; no writes to the dev database).
