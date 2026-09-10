## 1. Composition rules (`@lib/flavor-composition.ts`)

- [x] 1.1 Add the pure rule module (size registry G/M, name-token parser, `canvasFor`, `sumParts`, remainder computation, `formatComposition`) and verify its colocated unit spec covers sized/token-less names, remainder math, and the G/M fraction display conventions
- [x] 1.2 Run `npm test` + `npm run lint` and verify the new spec passes with zero warnings

## 2. Shared contracts (`@api/orders.api.ts`)

- [x] 2.1 Extend `orderItemListingSchema` with `unitPrice: z.number()` and `parts` (flavor-part array, default `[]`) and verify the existing listing specs still pass
- [x] 2.2 Change `IAddItemPayload.flavors?: string[]` to `parts?: { name: string; pieces: number }[]` and verify the type-check surfaces every stale call site (`npm run build`)

## 3. Composer (`@components/FlavorComposer`)

- [x] 3.1 Build the composer: renders same-size available PIZZA flavors of the catalog minus the base, each picker step consuming fatias from the canvas, base part auto-kept (so the emitted parts always sum to the canvas — never a partial payload on submit); verify its component spec covers offering only same-size available flavors and the remainder computation
- [x] 3.2 Verify the composer spec asserts the canonical split stays quiet: the base keeps the remainder, so an emitted composition (e.g. 2 of 8 fatias to a flavor) always sums to the canvas and no state is refused client-side

## 4. Add panels wiring

- [x] 4.1 Replace the free-text flavors field in the waiter `AddItemPanel` with the composer for token-bearing pizzas and verify the panel spec submits a payload with `parts` and shows the root error verbatim on refusal
- [x] 4.2 Do the same in the manager delivery `AddItemsPanel` and verify its spec covers composing a pizza on a delivery order
- [x] 4.3 Verify token-less PIZZA items (legacy names) add without a composer and their payload carries no `parts`

## 5. Composition display

- [x] 5.1 Render `formatComposition(parts)` under the item name on waiter order-detail lines, priced from the recorded `unitPrice`, and verify the detail spec asserts a composed line shows "Mussarela 1/2 · Chocolate 1/4" with the max-flavor price
- [x] 5.2 Render the same on the manager delivery-detail lines and verify the delivery spec asserts the composition and recorded price appear
- [x] 5.3 Extend the kitchen queue schema with `parts` (empty default) and render the composition line on `ItemTile`; verify the kitchen spec asserts a composed tile shows its composition and a plain item shows none

## 6. Verification

- [x] 6.1 Run the full `npm test` suite, `npm run lint` and `npm run build` and verify zero failures and zero warnings
