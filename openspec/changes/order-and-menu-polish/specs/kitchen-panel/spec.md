## REMOVED Requirements

### Requirement: Cancel a started preparation with a reason
**Reason**: Cancelling a started preparation no longer collects a reason; the action is a plain confirmation covered by the added requirement "Cancel a started preparation".
**Migration**: The panel never asks for a reason and the request carries none; the backend counterpart stops expecting one (sibling change `order-and-catalog-polish`).

## ADDED Requirements

### Requirement: Cancel a started preparation

A `Preparing` tile MUST offer a cancel action ("Cancelar preparo") that confirms without asking for a reason. Cancellation MUST only apply to `Preparing` items; the cancelled tile leaves the queue and the order remains open. Backend refusals MUST be shown verbatim.

#### Scenario: Cancelling a preparation
- **WHEN** the Cook cancels a dish in preparation, confirming the action without informing a reason
- **THEN** the tile leaves the queue and the order remains open

#### Scenario: Surfacing a backend refusal verbatim
- **WHEN** the backend refuses a start, finish or cancel action
- **THEN** the panel shows the backend message as-is, and the queues keep their current state
