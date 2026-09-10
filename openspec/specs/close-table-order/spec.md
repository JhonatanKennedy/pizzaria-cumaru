# close-table-order Specification

## Purpose
Closing an open table order with a payment method is the manager's verb in the SPA: on the order detail screen shared with waiters, the manager may close the order (Dinheiro/Cartão/Pix), turning it "Fechada" and freeing its table; waiters never see the action. Closing must wait for the kitchen: while any item of the order is still `Pending` or `Preparing`, the manager cannot close it. Traces to `features/07_manager_profile.feature` and `features/05_waiter_profile.feature`.

## Requirements

### Requirement: Manager closes an open table order
When a Manager views an open table order, the screen MUST offer a "Fechar conta" action that asks for the payment method (Dinheiro, Cartão or Pix) and closes the order through the backend (`POST /orders/:orderId/close`). On success the order MUST be shown as "Fechada" with its total, and its table MUST become available for a new service. While the request is in flight the dialog MUST prevent further actions; a backend refusal MUST show the backend's message verbatim with the dialog ready to retry.

#### Scenario: Closing a table order with a payment method

- **WHEN** a Manager opens an open order of table "10" with items and closes it choosing the payment method "CreditCard"
- **THEN** the close request is sent with the chosen payment method
- **AND** the order status becomes "Closed" with its total displayed
- **AND** table "10" becomes available for a new service

#### Scenario: The close fails on the backend

- **WHEN** the backend refuses the close request
- **THEN** the dialog shows the backend message as-is and the Manager can pick a method and retry

### Requirement: Waiter sees no close action
The order detail screen MUST NOT show any close action to a Waiter — closing is a Manager-only verb.

#### Scenario: Waiter opens an order detail

- **WHEN** a Waiter views an open table order
- **THEN** no "Fechar conta" action is present on the screen

### Requirement: Closing is blocked while items are in preparation
While any item of the open order is still `Pending` or `Preparing`, the Manager MUST NOT be able to close it: the "Fechar conta" action MUST be disabled with the hint "Ainda há itens em preparação". Once every kitchen item of the order reached `Ready` — or the order holds only items that need no preparation — the action MUST be available again.

#### Scenario: A kitchen item still in preparation blocks the close

- **WHEN** a Manager opens an open table order whose item is still "Pending" or "Preparing"
- **THEN** the "Fechar conta" action is disabled and the hint "Ainda há itens em preparação" explains why

#### Scenario: Closing once the kitchen is done

- **WHEN** every kitchen item of the open order reached "Ready", or the order holds only items that need no preparation
- **THEN** the "Fechar conta" action is available
