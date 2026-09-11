## Context

A pizza's size has no representation of its own. It is a trailing token on the catalog name, parsed by `pizzaSizeOf` on both sides — `apps/api/src/catalog/domain/sizes.ts` and `apps/web/src/lib/flavor-composition.ts` — and the whole composition feature is built on it: the canvas a pizza may be split across, the pool of flavors the composer offers (same canvas only), and the backend's `"Flavor must match the pizza size"` refusal. `openspec/specs/orders/order-creation` states the convention as contract: "Pizza items are registered per size as flat catalog entries whose names carry a trailing size token".

Nothing in the product produces that token except `apps/api/src/prisma/seed.ts`. The manager's `ItemFormDialog` collects name, description, price, category, preparation and ingredients; `CreateItemDto` accepts exactly those. The archived `pizza-flavor-splits` design deferred the gap deliberately ("registration UX for sizes is manager-side and out of scope here") and predicted its failure mode ("Size token in names can be mistyped at registration"). See proposal.md — Why.

Two facts constrain the approach and are not obvious from the form:

- The seed keeps token-less rows on purpose ("The token-less legacy names stay so past orders keep resolving their catalog item"), so a pizza without a size is legitimate data, not an error to be refused.
- `FlavorComposer` returns `null` when `canvasFor(base.name)` is `null`, and the form's default category is `PIZZA`. The default path therefore produces a pizza that can never be split, silently.

## Goals / Non-Goals

**Goals:**

- Make the size convention reachable and typo-proof from the manager's item form, without changing the wire contract.
- Explain the token-less case on screen instead of leaving it inert.
- Bring the two reported defects to the behaviour the specs already require.

**Non-Goals:**

- **Introducing a `size` field on the item.** Rejected below (D1). This change does not revisit the flat-name catalog decision, and carries no migration.
- **Registering both sizes in one submit.** Rejected below (D2).
- **Reconciling the `waiter-table-orders` tables-screen drift** noted in D5. Recorded, not fixed here.

## Decisions

**D1 — The size is composed into the name, not modelled as a field.**

The form gains a **Tamanho** selector; on save the token is appended (`Calabresa` + `G` → `Calabresa G`), and on edit the selector is initialised by running `pizzaSizeOf` over the existing name. The stored item remains a name, so `CreateItemDto`, the create-item use case, the Prisma schema and every existing row are untouched.

*Alternative:* a real `size` column on `Item`, with the token derived for display. Cleaner in the abstract, and `pizza-flavor-splits` named it as the obvious alternative — but it was rejected then for the same reason it is rejected now: sizes are already load-bearing in two shipped parsers and in the spec text of `orders/order-creation`, so a column means migrating every existing item, rewriting both parsers plus the seed, and changing a spec that another capability quotes. The cost lands entirely in service of a form control.

The round trip is the risk this decision accepts: the form now *writes* what two parsers *read*. `lib/flavor-composition.ts` gains a unit case that builds a name from a base and a size and parses it back, so a future change to the separator or casing fails in one place.

**D2 — One size per submit, not both at once.**

Each size is its own catalog entry with its own price, and the seed only appears to contradict that because it copies the base price onto both variants — G and M cost the same in seeded data, which reads as an artifact rather than a rule. A "create M and G together" control would either force one price for both sizes or need a second price field, and would register rows the manager never sees or confirms. The seed's own shape agrees: `Mussarela`, `Mussarela G` and `Mussarela M` are three independent entries.

**D3 — "Sem tamanho" stays selectable, and the form hints instead of refusing.**

Because token-less pizzas are legitimate (legacy rows kept for order history), the option cannot be removed and saving without it cannot be an error. The form shows a non-blocking notice that the pizza will be orderable whole but not composable — the fact the manager cannot otherwise discover, since the composer simply renders nothing.

*Alternative:* make the size mandatory for `PIZZA`. Rejected — it would make the seeded legacy pizzas uneditable, since editing runs the same form and the schema would refuse a save that changed only the price.

**D4 — The floor fix is an invalidation, not a refetch on navigation.**

`use-create-table-order` gains `TABLES_QUERY_KEY` alongside `ORDERS_QUERY_KEY`. The two mutations that release a table (`use-close-order`, `use-cancel-order`) already invalidate both, so this restores an existing convention rather than inventing one.

*Alternative:* lower `staleTime`, or flip `refetchOnWindowFocus` into a route-change refetch. Both are global changes to mask one missing line, and both would make every screen refetch more than the one that was wrong.

**D5 — The dev-login removal is total, and it simplifies boot.**

The bypass is removed at every point it is wired in, not just the buttons: the `dev-session` marker exists only to stop a boot refresh from failing for a session with no cookie behind it, so deleting the buttons while keeping the marker would leave dead storage. Removing `isDevSession()` collapses `restore()` to "no stored blob → no session", which is the honest test now that every session has a refresh cookie. `SeededProfiles` is kept: it is a read-only hint listing the logins the seed creates, and grants nothing.

D5 also surfaces pre-existing drift, recorded but not fixed: `waiter-table-orders`' "Opening the tables screen" scenario describes `/waiter/tables` as listing the day's open orders as cards with waiter, items and total, while the screen renders the floor (tables with free/occupied state). The stale-floor fix brings the implementation to `tables/management`'s "Listing the floor"; the `waiter-table-orders` wording is a separate reconciliation.

## Risks / Trade-offs

- **[Two size sources can disagree]** The selector offers M/G while `PIZZA_SIZES` is the registry, so adding a size means touching both → the options are derived from `PIZZA_SIZES` rather than written as a literal, so a third size appears in the form automatically.
- **[A mistyped legacy name still reads as unsized]** `pizzaSizeOf` matches `" G"`/`" M"` exactly, so a row already saved as `"Calabresa  G"` or `"Calabresa g"` opens the form showing *sem tamanho* → accepted; the manager sees the state and can resave it correctly, which is strictly better than today's silence. No data repair is attempted.
- **[The hint becomes noise on every pizza edit]** Every legacy pizza opens with the notice → the notice is bound to the *selection*, so it appears only while no size is chosen and disappears once one is.
- **[Removing the dev marker strands an existing dev session]** A browser holding `pizzaria-cumaru.dev-session` and a fake `id: 0` blob has no refresh cookie → accepted; the boot refresh fails, `clearSession()` runs, and the user lands on `/login` exactly once.
