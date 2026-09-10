## Context

See proposal.md — Why. Current state shaping the approach:

- The shared order detail (`src/pages/waiter/pages/order-detail.tsx`) already gates the close dialog behind `isOpen && canCloseOrder`, where `canCloseOrder` is a prop the route owner decides — today it is role-only (true on the manager route), with no look at item statuses.
- Item cancellation is offered per row through `canCancelOrderItem` (`status === null || 'Pending'`); drinks (null) stay cancellable, `Preparing`/`Ready` rows offer nothing. Whole-order cancel, item cancel and the kitchen "Cancelar preparo" all collect a required Motivo through the shared schema in `src/lib/cancellation.ts` and send `reason` in the body.
- The menu screen (`MenuTab`) lists all items flat (no category browsing), and each row carries four actions — `Ingredientes`, `Editar`, `Preço`, `Excluir` — each opening its own small dialog with its own mutation. The creation modal (`ItemFormDialog`) already collects the full item — name, description, price, category and "Exige preparo" — so it is the natural home for editing too.
- `GET /items` already returns every item with `ingredientIds`; the catalog listing is small and unpaginated, so filtering can stay client-side.

## Goals / Non-Goals

**Goals:**
- Enforce "no closing while the kitchen still works" in the SPA (disabled action + explanatory hint) with the backend refusal as the authoritative backstop (see sibling change).
- Reduce the three Motivo-collecting cancel flows to plain confirmations that send no reason.
- Make PIZZA/DISH items impossible to save without "Exige preparo".
- Give the menu a category filter and collapse the three per-row edit dialogs into the creation-like `ItemFormDialog`.

**Non-Goals:**
- Server-side filtering or pagination of the menu (the SPA has the whole catalog already).
- Changing the backend close gate, the cancel contracts or the item-update contract — those live in the sibling backend change and are consumed here.
- Touching the delivery advance flow or split bill.

## Decisions

### D1 — Close gate: disabled button + hint, backend remains authoritative

The manager's route computes the gate from the enriched order items: if any item has status `Pending` or `Preparing`, "Fechar conta" is disabled and the hint `Ainda há itens em preparação` renders next to it. The predicate is a pure helper (mirroring `canCancelOrderItem`) so it gets a unit test; `Ready` items and items without a preparation status (drinks) never block.

**Why disabled + hint over dialog-time refusal:** the manager should learn the blocker before opening the dialog; the backend refusal (message `Cannot close an order with items in preparation`) remains the backstop for the window between the SPA's last fetch and the click, and is displayed verbatim by the existing close dialog error path. The disabled state can never be perfectly fresh — a waiter can add a kitchen item after the manager's screen loaded — which is exactly why the backend gate is spec'd too.

### D2 — Menu category filter is client-side

The items tab gains a chip row — `Todas` (default, shows everything) plus the existing category labels (Pizzas, Pratos, Bebidas, Sobremesas, Acompanhamentos) — filtering the already-fetched list in local state. Labels reuse `CATEGORY_ORDER`/`categoryLabel` from `@lib/catalog.ts`.

**Why not a `?category=` query:** the listing endpoint returns the full unpaginated catalog that the kitchen, waiter and delivery screens already share; a server filter would add a contract for no data-size win. (The waiter add-items panel already filters the same payload client-side.)

### D3 — Cancellations become plain confirmations

The three dialogs (`CancelItemDialog`, `CancelOrderDialog`, the kitchen `CancelPreparationDialog`) drop the Motivo field and the reason from their request bodies; `src/lib/cancellation.ts` is deleted (no callers left). Error display stays as-is (backend messages verbatim). Per-row cancel-ability (`canCancelOrderItem`) is unchanged.

**Trade-off accepted:** no reason is recorded for any cancellation anymore — product decision (the operators did not have the motive at hand); audit history entries survive without reasons (backend drops the column).

### D4 — PIZZA/DISH always require preparation, enforced in the form schema

`itemFormSchema` gains the rule: category `PIZZA` or `DISH` with `requiresPreparation` unchecked → submission refused with the validation message `Pizzas e pratos exigem "Exige preparo"`. In the form, choosing "Pizzas" or "Pratos" pre-checks the flag (`setValue`) so the common path needs no extra click.

**Why schema-level refusal instead of a locked checkbox:** a disabled box hides why it is checked; keeping it editable plus a clear message lets the manager undo into an invalid state and see the explanation. Drinks, desserts and sides keep both states free (a dessert CAN require preparation). While editing, the category field is locked, so the rule also guards the edit path for PIZZA/DISH items.

### D5 — One edit dialog per item, reusing the creation form

`ItemFormDialog` gains an edit mode (an optional `initial` item): the dialog pre-fills name, description, price, "Exige preparo" and the ingredient checkboxes (from `item.ingredientIds` against the ingredients listing), locks the category, and saves through one update PATCH carrying name, description, price, `requiresPreparation` and `ingredientIds`. `EditItemDialog`, `PriceDialog` and `ItemIngredientsDialog` are deleted along with their hooks; the `MenuTab` row actions become `Editar` + `Excluir`, and the ingredient checkbox list replaces the separate link/unlink dialog.

**Why fold ingredients into the form:** the backend counterpart retires the per-link endpoints and replaces links wholesale on the single PATCH, so a separate ingredients dialog would lose its own save verb; one form also matches the "edit looks like create" goal.

## Risks / Trade-offs

- [Disabled close state goes stale while the screen is open] → the backend gate refuses and the existing dialog path surfaces the message verbatim; the order detail refreshes on navigation/refetch as today.
- [Wholesale `ingredientIds` replace in the update payload can clobber a concurrent edit's links] → accepted: single-operator intranet tool, and the form saves the whole item atomically, which removes today's partial-save states.
- [Landing order] → the SPA must not ship before the backend contract (cancel bodies without reason, richer item PATCH) — the two changes deploy in tandem; frontend tasks are marked to assume the backend change present.
- [Feature files 02/03/06/07/09/10 rewritten in this change must stay scenario-faithful to the new specs] → each rewrite task names the spec scenarios it mirrors: 02 for the menu (price/ingredient-link/edit scenarios move onto the single item update; filter and preparation-flag scenarios added), 07 for the close gate, and the motive lines in 03/06/09/10 drop with the reasons.

## Migration Plan

No data migration on the frontend. Deploy order: backend `order-and-catalog-polish` first (or atomically together), then this change — reason-less cancel bodies and the richer item PATCH only work against the new API.

## Open Questions

- The exact copy of the two new messages — hint `Ainda há itens em preparação` and validation `Pizzas e pratos exigem "Exige preparo"` — is a design default pinned in the specs; confirm or reword during apply (a wording change touches only the specs' quoted strings and the implementation, not the approach).
