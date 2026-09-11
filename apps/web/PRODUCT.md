# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three staff roles at a single pizzeria, each with a different screen and a different physical setting during a live service:

- **Waiter** (`joao.garcom`) — on the floor, moving between tables, holding a tablet or phone. Opens the order for a table, adds items (including split-flavor pizzas and per-item observations), adjusts quantities as the meal continues, and asks the kitchen to drop an item. Needs to glance, tap, and move on.
- **Cook** (`carlos.cozinha`) — at a mounted screen in the kitchen, hands busy and often gloved. Reads two queues (Delivery, then Local) in strict arrival order and only ever sees the dishes they must produce — never drinks, never other items. Starts, finishes, or cancels a preparation.
- **Manager** (`ana.gerente`) — at a desktop at the counter. Closes tables, maintains the menu and stock, manages the floor plan, runs delivery orders end to end, and reads the day's earnings.

The waiter is also the busiest user; the cook is the least tolerant of clutter. All three are internal staff on shift, not customers.

## Product Purpose

Run the service of one pizzeria from the moment a table sits down to the moment its earnings are counted. It holds the orders of every table independently, routes the kitchen's work in arrival order, keeps menu and stock in step with what can actually be produced, manages the floor plan and delivery orders, and closes the day with a sales report.

Success is a service that runs without paper: one order per table carried cleanly from opening to closing, a kitchen that never has to ask what to cook next, and a manager who can close any table and read the day without reconciling anything by hand.

## Positioning

An internal tool shaped by one restaurant's actual service ritual rather than a general-purpose restaurant platform. What it encodes and a generic POS could not truthfully copy:

- A table holds exactly **one** order for the whole meal — items accumulate across the service, and a cancelled order frees the table so a new one can open on the same table number.
- The kitchen queue is ordered by **arrival**, not by table or by dish, and splits Delivery from Local — and an item whose ingredient is out of stock leaves the queue entirely.
- Composed pizzas: one pizza, several flavors, each occupying its own fatias on the size's canvas, with the price following the multi-flavor rule.
- Stock is a property of the **ingredient**, not the dish — marking one ingredient unavailable removes every dependent item from every surface at once.
- Closing waits on the kitchen: an order with items still Pending or Preparing cannot be billed.

## Operating Context

- Used live during service, on the floor and in the kitchen, under time pressure — not in a back office afterwards.
- The waiter, cook, and manager are in three different places at once and see three different, role-gated views of the same data. A manager sees the waiter's and the cook's screens too.
- The kitchen screen is watched rather than driven: it refreshes on a 15-second cadence so the queue advances without anyone touching it.
- Sign-in is per staff member with seeded accounts; sessions are a JWT held in the browser and the app is served from a trusted intranet context.
- Every user-facing label is pt-BR. Backend error messages surface verbatim in English and are asserted as-is by the product specs — they are not to be translated.
- The product specs are Gherkin files under `features/`, one per flow; screens and rules trace back to scenarios there.

## Capabilities and Constraints

**Working today:** login and role-based routing; the waiter's floor view, table order, add items with flavors and observations, per-row quantity, item and whole-order cancellation; the kitchen panel with two queues, start/finish, and cancel-preparation; the manager board (salão, cozinha, entregas, cardápio — each line its state and the record waiting longest, under a rail that follows the manager onto every screen they can reach); manager menu and stock (items, ingredients, the item↔ingredient link); manager table management; manager delivery orders from creation to Delivered; the daily earnings report with the day's sales list and filters; close-order with payment type.

**Not built / open:** split bill is specified but unimplemented. `04_delivery_order` is manager-only in the SPA while the Gherkin still casts the flow in the waiter's hands — a reconciliation that is still open. There is no e2e suite.

**Technical constraints that shape UI work:** React 19 + TypeScript + Vite, Tailwind v4 (no config file — shared classes and `@theme` tokens live in `src/index.css`); TanStack Query owns all server state; React Hook Form + Zod own forms; TS enums are a compile error (`erasableSyntaxOnly`), so closed sets are `as const` arrays with derived unions. Screens live in bounded contexts under `src/pages/` and nothing leaks between contexts.

**Terminology that must stay stable:** Local / Delivery (order type), Livre / Ocupada (table state, derived from whether an open order exists — there is no status field), Pending / Preparing / Ready (item status), the three roles Garçom / Cozinheiro / Gerente.

## Brand Commitments

The name **Pizzaria Cumaru** is fixed. A real logo exists at `apps/web/assets-src/logo.jpeg`: the wordmark **CUMORU** in red with a gold pizzaiolo figure standing in for the second M, **PIZZARIA** beneath it in navy, on an off-white ground. It is the only brand asset on hand and it is authoritative.

The palette it establishes:

| Role | Hex |
| --- | --- |
| Brand red (wordmark, accent) | `#D43A2E` |
| Brand gold (figure, secondary accent) | `#F1BC0D` |
| Brand navy (supporting text) | `#1C3243` |
| Ground (off-white) | `#F7F7F7` |

The app currently approximates this with generic Tailwind `red-700`/`stone-*` utilities, which do not match the brand red. No voice, tone, or typographic commitment has been established beyond pt-BR labels.

## Evidence on Hand

- `features/*.feature` — the product specs as Gherkin, one file per flow (`01_authentication` … `10_table_management`, no `08`). The authority on behavior and on the exact error strings the UI must surface.
- `openspec/specs/` — 22 capability specs (8 UI-level, 14 domain-level); `openspec/changes/archive/` holds 33 archived changes.
- `apps/api/src/prisma/seed.ts` — the seeded reality: three staff accounts, 12 ingredients, 20 items (pizzas expanded into G/M variants), 10 tables. This is the data any screenshot or demo will show.
- `apps/web/assets-src/logo.jpeg` — the brand asset described above.

**Absences future work must not fill in:** there are no customers, testimonials, press, photography, or usage metrics. This is internal software for one restaurant; inventing social proof, a customer count, or a benchmark would be fabrication.

## Product Principles

1. **The service runs the clock.** Every screen is used mid-service, under time pressure, often one-handed or with busy hands. Legibility and tap accuracy at a glance beat density and decoration.
2. **One context per role, nothing leaked.** The cook never sees the ingredient list; the waiter never sees the earnings report. A screen shows what its role must act on and nothing else.
3. **The backend's rules are the truth.** Guards, refusals, and error strings come from the API and are surfaced exactly as they arrive. The UI mirrors a rule only when it must (to disable an action early), and says so where it does.
4. **Stock and state are shared facts.** An ingredient out of stock, a table with an open order, an item the kitchen has finished — each is one fact visible identically on every surface that shows it.
5. **One order per table, one truth per fact.** No screen invents a second source for something the domain already decides.

## Accessibility & Inclusion

No product-specific accessibility standard has been established. The house rules already require real semantics (native elements, `aria-label` where the only label is visual, `role="alert"` for surfaced errors) and tests that query by role and label.
