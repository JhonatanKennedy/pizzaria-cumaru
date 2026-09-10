## Context

Today `OrderItem.flavors` is a `String[]` of pizza names (Prisma scalar list): the add-item use case records the base pizza name plus any free-text flavors, prices the item with `Math.max` over the names resolved through the catalog, and neither the order payloads nor the kitchen queue expose more than the names. There is no notion of size, fatias or portions anywhere in the backend. The product wants fatia-level composition over sized pizzas (M = 6, G = 8), where pizza catalog entries are flat items whose names carry a trailing size token ("Mussarela G"). See proposal.md; requirements in specs/orders/order-creation and specs/kitchen/kitchen-queue.

## Goals / Non-Goals

**Goals:**
- Record, validate and expose a composed pizza as ordered parts — each with a name and a fatia count — while keeping the max-price rule unchanged.
- Keep the payload shape future-proof: a part list is the same contract the frontend composer will emit.

**Non-Goals:**
- No catalog model change: sizes live in item names (trailing token), the manager menu registers one flat item per pizza per size.
- No price-rule change, no delivery-order or checkout changes beyond the shared item payload.

## Decisions

**D1 — `flavors` becomes a JSON column holding ordered parts `{ name, pieces }[]`.**
Prisma scalar list of strings → `Json` (or `TFlavorPart[]` with the jsonb column), one migration. The base flavor is always present as the first part: an added pizza without a split records the whole canvas as a single part (e.g. `[{ name: "Mussarela G", pieces: 8 }]`), preserving today's "defaults to the catalog item" behavior while making every pizza row self-describing.
*Alternative:* a parallel `flavorPieces` column plus the old names — dual-write drift, two sources of truth, no benefit. Rejected.

**D2 — Size canvases come from a token parser on the item name; unknown tokens default to G (8) with the token registry as the single source.**
`SIZES = { G: 8, M: 6 }`, parsed from a trailing `" G"`/`" M"` token on the item name. Composition requires every participating item to carry a token; a size-less name resolves to 8 (the pre-size naming of the seed data) only for legacy-row migration, never for new compositions.
*Alternative:* an explicit `size` field on the item entity — cleaner, but the product chose flat names ("Mussarela G"); that catalog decision is not revisited here.

**D3 — Add-item validation for a composed pizza runs entirely in the domain use case, before persistence.**
The DTO accepts `parts?: { name: string; pieces: number }[]` (replacing `flavors?: string[]`). When parts are absent, the use case derives the single whole-canvas part. Validation order, each failing with its spec'd message:
1. every part resolves to a registered PIZZA item whose name token matches the base item's token, else `"Flavor is not a registered pizza"` (for the first part, the base, resolution failure surfaces as the existing unresolvable-item error);
2. size tokens equal, else `"Flavor must match the pizza size"`;
3. pieces are positive integers and sum to the canvas, else `"Flavor pieces must sum to the pizza size"`;
4. availability — the existing `assertAvailable` now runs for the base item *and* every flavor item, else `"Item is unavailable"`.
The unit price stays `Math.max` over the prices of the base plus each distinct flavor item — the archived rule, unchanged, only resolved over part names.
*Alternative:* validate in the controller layer — rules are domain policy (they fail differently per item state); keep them next to `resolveUnitPrice` in the use case / item entity.

**D4 — Legacy `String[]` rows migrate by a convention, dev data only.**
Prisma migration rewrites existing rows: a single-name list (`["Mussarela"]`, the historic default) becomes the whole-canvas part for that size token, defaulting to 8 when no token is present; a multi-name list (`["Calabresa", "Portuguesa"]`, historic free-text splits) becomes equal halves of 8. The seed is regenerated with sized pizza names so no production-real data carries the ambiguity.
*Risk acknowledged:* halves-of-8 is a guess for legacy multi-flavor rows that predate the fatia model. The archive history shows only development usage; if real orders ever existed, the migration SQL must be reviewed before running.

**D5 — The kitchen queue and order payloads expose parts as recorded.**
`GET /kitchen/queue` rows gain the part list (`{ name, pieces }[]`, empty for non-pizza items), and the order read models carry it through from the stored column — the same shape the add endpoint consumes, so the frontend round-trips one contract.

## Risks / Trade-offs

- [Legacy multi-flavor rows are re-mapped to halves-of-8 by guess] → dev data only; the migration is reviewed before any production run (D4).
- [A flavor item's stock runs out after the pizza is added] → the pizza stays orderable as recorded (availability is checked at add time only, as today); the kitchen sees the composition regardless of current stock.
- [Size token in names can be mistyped at registration ("Mussarela H")] → such an item can still be added whole (canvas defaults to 8) but cannot be used as a flavor of a token-bearing base or vice versa; registration UX for sizes is manager-side and out of scope here.
- [JSON column drops relational queryability of flavors] → no report queries on flavors exist today; the composition is display data, read via the order and queue rows.

## Migration Plan

1. Add `parts` semantics to the entity + add-item DTO; keep the old `flavors` field read for one release only on the read path? — no: frontend and backend ship together in this repo pair; the DTO change is breaking by design and both sides land in the same change set (`pizza-flavor-composition` on the frontend, blocked on this change).
2. Migration: `flavors String[]` → JSON column with the D4 rewrite, plus reseeding sized pizza items.
3. Post-migration cleanup: drop the legacy scalar-list references; run the e2e specs of 03/04 against the new contract.

## Open Questions

*None — the base-item resolution case is settled by the existing code: an unresolvable `itemId` throws `'Item not found'` (add-item-to-order.ts:40), kept verbatim for the base case; the spec only adds the refusal for unresolvable *flavor* parts (`"Flavor is not a registered pizza"`), replacing today's silent skip in `resolveUnitPrice`.
