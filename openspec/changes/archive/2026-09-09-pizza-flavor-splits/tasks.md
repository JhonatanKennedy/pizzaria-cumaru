## 1. Storage & entity

- [x] 1.1 Change the Prisma model: `OrderItem.flavors String[]` → JSON column holding `{ name, pieces }[]`; add the migration with the legacy-row rewrite (single name → whole-canvas part of its size token, defaulting to G/8; multi-name → halves of 8) and verify `npm run build` passes and the migration applies cleanly on a dev database
- [x] 1.2 Update `OrderItems.create` and the `OrderItem` entity to hold the part list typed as `TFlavorPart[]` and verify the entity unit spec covers whole-pizza (single part) and composed rows

## 2. Size tokens & add-item validation

- [x] 2.1 Add the size registry (G → 8, M → 6) with a name-token parser (`sizeCanvas(name)`) in the catalog/domain shared spot and verify unit tests cover token-bearing and token-less names
- [x] 2.2 Replace the `flavors?: string[]` DTO with `parts?: { name: string; pieces: number }[]` in the add-item flow (order + delivery) and verify the type-check passes end to end
- [x] 2.3 Extend the add-item use case: parts default to the whole-canvas base part; validate parts resolve to registered PIZZA items ("Flavor is not a registered pizza"), same size token as the base ("Flavor must match the pizza size"), positive pieces summing to the canvas ("Flavor pieces must sum to the pizza size"), and availability of base + every flavor ("Item is unavailable"); verify the use-case spec asserts each refusal message and the passing composed case records parts with the max-price unit price

## 3. Read paths expose the composition

- [x] 3.1 Expose the recorded parts on the order read models (`GET /orders`, order detail) and verify the list-orders spec asserts parts round-trip
- [x] 3.2 Expose the parts on `GET /kitchen/queue` rows (empty for non-pizza items) and verify the kitchen-queue spec asserts composed rows carry each flavor with its fatias in recorded order

## 4. Seed & regression

- [x] 4.1 Reseed pizza catalog items with sized names ("Mussarela G"/"Mussarela M" per pizza) and verify the seed runs against the migrated schema
- [x] 4.2 Run `npm run test:e2e` and verify 03_table_order and 04_delivery_order scenarios still pass against the new payload contract
