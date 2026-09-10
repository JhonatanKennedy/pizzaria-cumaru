# Design — Item↔ingredient links

## Context

The backend owns the truth: the item aggregate stores its ingredient ids, `POST /items` links them at creation, `POST /items/:itemId/ingredients` and `DELETE /items/:itemId/ingredients/:ingredientId` manage them afterwards, and availability is computed from the links everywhere (`ListItemsUseCase`, kitchen queue, `AddItemToOrderUseCase` refusal `'Item is unavailable'`). The gap was entirely in the SPA — no surface to read or write links — plus `GET /items` not exposing `ingredientIds`, so even the read side was absent. Feature file: `features/02_menu_and_stock.feature`.

## Goals / Non-Goals

- Goal: create-with-ingredients and per-item link management on the Menu and stock screen, with the availability derivation visible.
- Non-goals: ingredient CRUD inside the dialog (ingredients keep their own form flow); bulk links; a link-creation flow on the ingredient side; anything in the waiter/kitchen contexts — their availability gating already exists and stays untouched.

## Decisions

### 1. `ingredientIds` is required on the shared menu contract

`menuItemSchema` requires `ingredientIds: z.array(z.string())` and the form schema mirrors it. Unlinked items carry `[]` — valid. A backend still running the old shape makes every menu parse fail loudly at the API boundary (the project's chosen behavior for lockstep contracts) instead of silently dropping links.

- *Why:* the field is now part of every item the backend returns; optionality would hide a stale backend behind empty arrays.

### 2. Link management is a dedicated dialog per item, not part of the edit form

The edit flow renames/describes an item; ingredient links are a different shape of edit (a set of toggles against a live availability state). A dedicated `ItemIngredientsDialog` opened from an "Ingredientes" row action keeps the row grid uncluttered and gives the toggle its own busy/error lifecycle.

### 3. The dialog edits a local snapshot, not the query cache

The dialog seeds a local `Set<string>` from `item.ingredientIds` (a snapshot taken when it opens). A successful toggle flips the Set; a failed one leaves it — the checkbox never shows a state the backend did not confirm, and the per-row busy flag prevents racing the same toggle twice. On close the menu query refreshes (mutations invalidate `MENU_QUERY_KEY`), so row availability and the dialog's next opening both see the new links.

- *Why:* editing the TanStack cache directly would couple the dialog to query internals and leave unconfirmed toggles visible.

### 4. Out-of-stock ingredients stay selectable

Linking an unavailable ingredient is legal — the backend saves the link and the item becomes unavailable because of it (an item with a missing ingredient cannot be served). The form/dialog mark such ingredients "Indisponível" as information, not as a blocker. The manager's real intent may be to prepare the link while stocking up.

### 5. The item form field is required with `defaultValues: []`

`useForm` + `zodResolver` rejects a schema field whose input/output types diverge (a `.default([])` produces a resolver whose input type is not assignable under strict typing). The field is therefore required in the schema (empty array valid) and React Hook Form delivers `[]` for an untouched checkbox group via `defaultValues` — the resolver-typing-safe formulation, verified by the empty-submission spec.

## Risks / Trade-offs

- [Lockstep contract] → Menu and stock screens break loudly until the backend change ships; the two deploy together (backend first, verified by its own gate).
- [Toggle shows stale availability within the dialog] → The dialog snapshots links, not derived availability; availability is read from the refreshed menu listing, which the stock toggles already invalidate.
- [Checked-but-unavailable on create] → Deliberate: creating a link to an out-of-stock ingredient produces an unavailable item on the next refresh, consistent with decision 4.

## Migration Plan

Backend first (additive listing field), then the frontend contract + UI (additive). Rollback: revert the frontend change alone — the old client parses fine against a backend that returns the extra key, because zod strips unknown keys.

## Open Questions

None that change specs or tasks. (Ingredient quantities per item, if the product ever wants them, are a separate change: the current contract is a plain id list on both sides.)
