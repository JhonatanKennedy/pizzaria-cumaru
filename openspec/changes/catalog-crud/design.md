# Design — catalog CRUD

## Context

Domain verbs already exist for almost everything (`Item.rename/changeDescription/linkIngredient/unlinkIngredient`, `Ingredient.create`, repositories with save + finders); the gaps are an `Ingredient.rename`, create/delete persistence paths, use-cases, and routes. Schema receipts that drive the design: `OrderItem.itemId` is a plain string with **no FK** to `Item` (deleting an item can never be blocked by order history), and `ItemIngredient` declares `onDelete: Cascade` on both relations (deleting an item or ingredient auto-removes its links at the DB level). See proposal.md — Why.

The established patterns to mirror: use-cases generate ids with `randomUUID()` (`create-order.ts`, `add-item-to-order.ts`) and `PrismaOrdersRepository.save` uses `prisma.order.upsert` (create + update in one shape).

## Goals / Non-Goals

**Goals**
- Manager-only CRUD over items (create; rename; description; price via the existing route; link/unlink ingredients; remove) and ingredients (create; rename; remove).
- Permissive deletion: history rows never block or break — matching the user's decision that sold items "vanish from tables" (their catalog rows, not the order rows).
- Reuse the existing listing/availability derivations so nothing else in the read models changes.

**Non-Goals**
- No new categories (EItemCategory unchanged), no stock-management changes, no waiter-role writes, no schema migrations (no FK/nullability changes — the schema already behaves as the removal semantics need).
- No order-creation behavior changes.

## Decisions

### 1. Duplicate names refused in the use-case layer, not by constraint
`findItemByName` exists; `findIngredientByName` will be added. Create and rename use-cases check-then-act and throw `Item name already in use` / `Ingredient name already in use`. Alternative considered: a DB `@unique` — rejected because the check happens across soft boundaries (no soft-delete rows today, so uniqueness holds while rows exist) and a unique constraint would need a migration for a rule the spec already enforces. Risk: check-then-act race under concurrent creates — acceptable in a single-restaurant scaffold; noted under Risks.

### 2. Create persists through upsert-style saves, mirroring the orders repository
The current `saveItem`/`saveIngredient` call `prisma.item.update` / `prisma.ingredient.update` and would throw on a fresh row. Rather than adding parallel `create` methods, convert both to `upsert` (the orders repository's save pattern): the item upsert rewrites `ingredients` links (`deleteMany` + `create`) in both branches, and the ingredient upsert writes `name` + `inStock`. The mapper methods in the repository file (`orderDomainToUpdate`-style helpers there today) get their catalog equivalents. Delete methods are then the only interface additions: `deleteItem(id)`, `deleteIngredient(id)` — plain `prisma.item.delete` / `prisma.ingredient.delete`, with the DB cascade removing `itemIngredient` rows (no FK exists from `OrderItem`, so nothing else touches).
- Alternative considered: separate `createItem` methods — rejected as extra surface for no behavioral difference once save is an upsert.
- Existing callers (`update-item-price`, stock marking) keep working unchanged — upsert behaves identically for existing rows.

### 3. New use-cases, one per verb, ids from the use-case
`CreateItemUseCase` (validates category against `EItemCategory`, non-negative price via `Item.create` invariants, non-blank name/description, ingredient ids resolved via `findIngredientById`, then `id: randomUUID()`), `RenameItemUseCase`... In practice, group the routes that share an aggregate read: a single `UpdateItemUseCase` handling rename + description (both hit one `findItemById` + `saveItem`), plus `CreateItemUseCase`, `RemoveItemUseCase`, `LinkIngredientToItemUseCase`, `UnlinkIngredientFromItemUseCase`, `CreateIngredientUseCase`, `RenameIngredientUseCase`, `RemoveIngredientUseCase`. Naming and grouping are apply-time details; the rule is one use-case per route with `randomUUID()` at the create boundary.

### 4. Route surface (Manager-only throughout)
```
POST   /items                                  create item (name, description, price,
                                                 category, requiresPreparation,
                                                 ingredientIds?)
PATCH  /items/:itemId                          rename + description (name?, description?)
PATCH  /items/:itemId/price                    (existing route, unchanged)
POST   /items/:itemId/ingredients              link { ingredientId }
DELETE /items/:itemId/ingredients/:ingredientId  unlink
DELETE /items/:itemId                          remove
POST   /ingredients                            create { name }
PATCH  /ingredients/:ingredientId              rename { name }
DELETE /ingredients/:ingredientId              remove
```
`PATCH /items/:itemId/price` stays as-is (already shipped + e2e-covered) rather than folding price into the generic PATCH — additive and non-breaking; a future consolidation can happen when a client exists. Category is absent from PATCH because the domain has no category setter (a pizza stays a pizza). `requiresPreparation` is an explicit create-field (matches how rows are seeded today) rather than derived from category, because "dessert/side" do not map cleanly; the create form can prefill it from the category client-side.
- All routes `@Roles({ roles: [EUserRole.MANAGER] })`; waiter/cook listings unchanged. `roles.guard.ts` matrix comment updated.

### 5. Rename/description ripple is free
Item name/description flow through `saveItem`'s write columns and every read model already reads live rows (`list-items`, kitchen queue name lookup, order reads) — nothing else needs to change. The spec scenarios asserting "renamed pizza shows everywhere" hold by construction; e2e asserts the listing + queue.

## Risks / Trade-offs

- [Concurrent create with the same name slips past the check-then-act guard] -> single-restaurant scale; DB row still written, no corruption. A `@unique` migration is the escalation path if it ever matters.
- [Deleting an ingredient silently rewrites every dish that used it (links cascade, dishes stay on sale)] -> Decided permissively with the user; the spec scenario documents it explicitly so it reads as intended behavior, not a bug.
- [Upsert conversion touches a shared repository path used by shipped flows] -> Behaviorally identical for existing rows (update-only inputs); the full catalog e2e + unit suites guard the conversion.
- [Price route and generic PATCH both mutate the item] -> Both funnel through `saveItem`; no divergence possible.

## Migration Plan

No data migration; no seed changes. Deploy order irrelevant (additive routes). Rollback: remove routes/use-cases; upsert change is backward-compatible with the old save callers.

## Open Questions

None — removal semantics, actors, and scope were settled with the user during exploration.
