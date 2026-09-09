## Context

Today the waiter's `AddItemPanel` and the delivery `AddItemsPanel` treat flavors as free text: a comma-split string sent as `flavors: string[]`, shown only when `selectedItem.category === 'PIZZA'`. The shared listing contract (`@api/orders.api.ts`) drops `unitPrice` and `flavors` from order items (zod strips unknown keys), so screens re-derive line prices from the menu catalog via `enrichOrder` — which will disagree with the recorded max-flavor price once pizzas are split. The product wants fatia-level composition over sized pizzas (M = 6, G = 8, size carried by a trailing name token per the flat catalog). Backend contract: sibling change `pizza-flavor-splits` — parts `{ name, pieces }[]` replace `flavors: string[]`; this change is blocked on it. See proposal.md and the specs (waiter-table-orders, kitchen-panel, delivery-orders).

## Goals / Non-Goals

**Goals:**
- Replace free-text flavors with a composer that splits the pizza's fatias among available same-size pizza flavors, the selected pizza keeping the remainder.
- Show the composition on the order lines (waiter + delivery) and on the kitchen tiles, priced from the recorded unit price.
- One composer + one composition rule set shared by all consumers.

**Non-Goals:**
- No pricing logic in the frontend (the backend owns the max-price rule; the composer only previews the base price).
- No catalog changes, no manager registration of sized items (they arrive through the menu screen; the seed regenerates sized pizzas in the backend change).

## Decisions

**D1 — Composition rules live in `@lib/flavor-composition.ts`, shared by waiter, delivery and kitchen.**
Pure TS: the size registry (`G → 8`, `M → 6`), a name-token parser mirroring the backend's, `canvasFor(name)`, `sumParts(parts)`, the remainder computation, and `formatComposition(parts)` for display. Kitchen tiles and the manager delivery screen may import from `@lib` (shared folder), so the rules are written once and unit-tested once, colocated.
Display convention: the whole-canvas part renders as the bare name; parts reduce to the common fractions (1/2, 1/3, 2/3, 1/4, 3/4) rendered as "Mussarela 1/2 · Chocolate 1/4"; anything else renders as "N fatias" per part. Formatting is unit-tested against G and M examples (M splits rarely reduce cleanly).

**D2 — A shared `@components/FlavorComposer` replaces the free-text field in both add panels.**
The two panels are already duplicating each other; the composer is the second pizza-specific behavior, so it becomes the shared cross-context widget: props are the selected base pizza, the catalog items of the same size that are `available` and PIZZA (base excluded — it owns the remainder), and the canvas; it emits `TFlavorPart[]`. The base part (remainder) is computed by the rule set, never typed. Quantity/notes stay in each panel's own React Hook Form; the composer holds its own part state and the panels serialize it into the payload's `parts` on submit — no hidden form fields.
*Alternative:* duplicate a composer inside each context panel — rejected; the panels are already twins and the composer is pure behavior, so the shared kit earns its place.
*Alternative:* compose on the backend by name only — rejected; the spec requires the waiter to give each flavor its fatias.

**D3 — Only token-bearing pizzas are composable; token-less PIZZA items keep today's plain behavior.**
A pizza is composable when its name carries the M/G token (the flat catalog's per-size registration convention). The composer simply does not render for token-less bases — matching the backend, which refuses part payloads against a size-less base. (Until the catalog is reseeded with sized items, the composer stays hidden for the legacy unsized pizzas.)
*Alternative:* guess a canvas (8) for token-less names — rejected; it would let unsized items split and contradict D1's parser.

**D4 — The shared listing contract grows `unitPrice` + `parts` per order item, and line prices stop being catalog-derived.**
Backend order rows have always recorded `unitPrice` (the wire already carries it — the schema stripped it); after the sibling change they also carry `parts`. `orderItemListingSchema` parses `unitPrice: z.number()` and `parts: flavorPartSchema.array().default([])` (older rows keep an empty composition), `IAddItemPayload.flavors` becomes `parts`. `enrichOrder` renders the recorded `unitPrice` for the line and drops the catalog-price fallback for price; the catalog join is retained for names/availability only. This closes the latent line-vs-total inconsistency (a composed pizza recorded at the max flavor price will no longer show the base's catalog price on the line).
*Alternative:* keep deriving the price from the catalog — rejected; that is exactly the price bug the composition would introduce.

**D5 — Display surfaces.**
Waiter and delivery order lines render `formatComposition(parts)` under the item name when parts have more than one entry or differ from the whole canvas. Kitchen tiles render the same line from the queue item's parts (queue schema gains the parts array, empty default — same tolerance pattern as `notes`).

**D6 — The composition is complete by construction; backend refusals stay verbatim.**
The base keeps the remainder, so whatever the composer emits already sums to the canvas — there is no partial state a client message could refuse, and the canonical splits the specs name (half of a G kept by the base, or 2 of 8 fatias given to a flavor) must submit cleanly. The composer only guards what it can: flavors that would overrun the canvas are disabled, and taking every flavor back returns the payload to `[]` (a plain whole-pizza add). Server rejections ("Flavor is not a registered pizza", "Flavor must match the pizza size", …) surface verbatim through the existing `toErrorMessage` root-error alert — the specs assert only the offering behavior client-side.

## Risks / Trade-offs

- [Backend and frontend ship out of order] → the schema change is loud, not silent: an old backend omitting `parts`/`unitPrice` fails the parse visibly, and the payload rename breaks the type-check. Both repos land as one feature pair (this change depends on `pizza-flavor-splits`).
- [Legacy order rows show an empty composition] → acceptable: their migrated parts (whole canvas or halves) arrive once the backend change ships; rows created before it have no composition to show.
- [Flavor list grows long on a many-way split] → the composer caps options at same-size available PIZZA items; a pizza with more than a few parts is unrealistic and the display degrades gracefully (line wraps).

## Migration Plan

1. Land the sibling backend change first (`pizza-flavor-splits`): reseeded sized catalog, parts on the wire.
2. Frontend, in one commit train per surface: `@lib` rules → shared schema/payload → composer → both panels → order-line and kitchen-tile display → specs.
3. No data migration on the frontend; dev orders are regenerated against the new backend.

## Open Questions

*None — the two historically open conventions were settled from code evidence: legacy rows carry recorded `unitPrice` on the wire already (D4), and the delivery panel duplicates the waiter panel's free-text logic (D2).*
