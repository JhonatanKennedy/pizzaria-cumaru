## MODIFIED Requirements

### Requirement: Cancel an open table order

The waiter MUST be able to cancel the whole open order from its detail screen through a plain confirmation — no reason is collected and none is sent. On success the screen MUST return to the tables screen, where the freed table shows without an open order. Refusals from the backend (order no longer open) MUST be displayed verbatim.

#### Scenario: Cancelling an order because the customer gave up
- **WHEN** the waiter cancels the open order of table "5" from its detail screen and confirms the cancellation
- **THEN** the screen returns to the tables screen and table "5" shows without an open order

#### Scenario: Cancelling without a reason
- **WHEN** the waiter cancels an open order without informing a reason, since the confirmation does not ask for one
- **THEN** the order is cancelled: the screen returns to the tables screen and the freed table shows without an open order

#### Scenario: Backend refuses the cancellation
- **WHEN** the backend refuses the order cancellation
- **THEN** the dialog shows the backend's message verbatim and the order stays open

## REMOVED Requirements

### Requirement: Cancel a pending item
**Reason**: Item cancellation no longer collects a reason; cancelling a Pending item is now a plain confirmation covered by the added requirement "Cancelling a pending item".
**Migration**: Cancellation requests no longer carry a reason and the UI never asks for one — no client or data migration applies.

## ADDED Requirements

### Requirement: Cancelling a pending item

A mistaken item MUST be removable from an open order while it is `Pending` or while it has no preparation status (an item that needs no preparation never enters the kitchen flow). The confirmation MUST NOT ask for a reason. Items with status `Preparing` or `Ready` MUST offer no cancellation action on the detail screen.

#### Scenario: Cancelling a pending item
- **WHEN** the waiter cancels a Pending item through the plain confirmation
- **THEN** the item is removed from the order and no reason is collected

#### Scenario: No cancellation for items in preparation
- **WHEN** an item has status "Preparing" or "Ready"
- **THEN** the detail screen offers no cancellation action for it
