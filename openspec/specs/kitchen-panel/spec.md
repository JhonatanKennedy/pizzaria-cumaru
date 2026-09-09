# Kitchen Panel Specification

## Purpose

The cook's production panel (Kitchen Panel): two queues of item tiles ordered by arrival showing only the items that require preparation, with start, finish and cancel-preparation actions per item. Traces to `features/06_cook_profile.feature`.

## Requirements

### Requirement: Show two queues ordered by arrival

The Kitchen Panel MUST present two queues — **Entrega** (delivery) and **Local** (table) — each a flat stack of item tiles in the exact arrival order the kitchen queue returns (orders by arrival, items within an order by item arrival). The panel MUST NOT re-sort the payload.

#### Scenario: Delivery and Local columns

- **WHEN** a Cook opens the Kitchen Panel with an open delivery order and open table orders
- **THEN** the panel shows an **Entrega** column and a **Local** column, each with its tiles in arrival order

### Requirement: Show only prepared-by-kitchen items

A queue MUST only ever contain tiles for items that require preparation; drinks and other non-prepared items MUST NOT appear, and an item whose ingredients are out of stock MUST NOT appear. Orders left with no visible items MUST NOT contribute tiles.

#### Scenario: Drinks are hidden from the cook

- **WHEN** a Cook views the queues for a table order that also contains a drink
- **THEN** only the items requiring preparation appear as tiles, and the drink does not

### Requirement: Present only the item itself on each tile

Each tile MUST show the item name, its quantity, its status label and a background color indicating the status, and the item's notes when it has any. A tile MUST NOT show any order-level information — no table number, no customer name, no order or item identifiers.

#### Scenario: Tile contents

- **WHEN** a Cook views a queue containing a preparation item that carries notes
- **THEN** the tile shows the item name, quantity, status and the notes, colored by its status

#### Scenario: Tiles stay anonymous

- **WHEN** a Cook views any tile in either queue
- **THEN** no table number, customer name or order identifier is visible anywhere in the panel

### Requirement: Reflect the status through the tile

A tile's background color MUST follow the item status returned by the queue — one color for `Pending`, another for `Preparing` — so the color always agrees with the state the next action will transition. The two colors MUST be defined once as theme tokens so a palette change repaints the panel without touching components.

#### Scenario: Coloring follows the queue state

- **WHEN** an item moves from `Pending` to `Preparing` after a start action
- **THEN** its tile renders with the `Preparing` color and the corresponding status label

### Requirement: No ingredient consultation for the cook

Kitchen tiles MUST NOT offer any ingredient consultation or ingredient-management action.

#### Scenario: The cook has no ingredient option

- **WHEN** a Cook views any tile in the Kitchen Panel
- **THEN** no ingredient-related action or link is available

### Requirement: Start a preparation

A `Pending` tile MUST offer a start action ("Iniciar preparo"). On success the item MUST display as `Preparing` on the next queue refresh.

#### Scenario: Starting a pending dish

- **WHEN** the Cook starts the preparation of a dish in status `Pending`
- **THEN** the dish shows in status `Preparing`, with its tile in the same queue position

### Requirement: Finish a preparation

A `Preparing` tile MUST offer a finish action ("Finalizar"). Finishing one item MUST NOT change the order status nor the status of the other items; the finished item (now `Ready`) leaves the queue on the next refresh.

#### Scenario: Finishing a dish leaves the other items alone

- **WHEN** the Cook finishes a dish that is in preparation while another item of the same order is still `Pending`
- **THEN** the finished dish's tile leaves the queue and the `Pending` item's tile remains in its position

### Requirement: Cancel a started preparation with a reason

A `Preparing` tile MUST offer a cancel action ("Cancelar preparo") that asks for a required reason before sending it. Cancellation MUST only apply to `Preparing` items; the backend records the reason in the order history and the order remains open.

#### Scenario: Cancelling a preparation with a reason

- **WHEN** the Cook cancels a dish in preparation informing the reason
- **THEN** the tile leaves the queue, the reason is sent with the request, and the order remains open

#### Scenario: Refusing a cancel without a reason

- **WHEN** the Cook tries to cancel a preparation without informing a reason
- **THEN** the panel refuses the action and shows the validation message "Motivo é obrigatório"

#### Scenario: Surfacing a backend refusal verbatim

- **WHEN** the backend refuses a start, finish or cancel action
- **THEN** the panel shows the backend message as-is, and the queues keep their current state

### Requirement: Keep the queues fresh

The Kitchen Panel MUST refresh its queues automatically every 15 seconds and MUST offer a manual refresh action ("Atualizar"). While an action is in flight its tile MUST be busy (no repeated clicks); while the queues load the panel MUST show a loading state, and a failed load MUST show the backend message with a retry path.

#### Scenario: Auto and manual refresh

- **WHEN** the Kitchen Panel is open
- **THEN** the queues refresh on their own every 15 seconds, and a manual refresh button is available
