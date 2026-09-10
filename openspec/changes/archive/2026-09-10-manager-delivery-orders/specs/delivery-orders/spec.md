## ADDED Requirements

### Requirement: Register a delivery order

The manager MUST be able to register a delivery order with the customer's name, phone and delivery address. The order MUST appear in the delivery list without a table and open on its detail screen after creation. An empty customer name or address MUST be refused with the backend's own message shown as-is.

#### Scenario: Registering a WhatsApp order

- **WHEN** the manager registers a delivery order for "Maria Souza" with phone "(88) 99999-0000" and address "Rua das Flores, 12"
- **THEN** the order appears in the delivery list with the customer name and total
- **AND** the manager lands on the new order's detail screen

#### Scenario: Registering an order without the address

- **WHEN** the manager submits the delivery order form with a customer name but an empty address
- **THEN** the operation is refused and the message "Delivery address is required for delivery" is displayed

### Requirement: Advance a delivery order to its door

While a delivery order is open, the manager MUST be able to add items to it; the order MUST then advance through `Preparing` and `Out for delivery` until `Delivered`, one action at a time, each action named after its step. Items that are unavailable MUST NOT be addable. A delivered order MUST show the time it was delivered and offer no further actions. The screen MUST reflect the current status throughout.

#### Scenario: Adding items to an open delivery order

- **WHEN** the manager opens the delivery order of "Maria Souza" and adds 2 "Calabresa" pizzas with the flavor "Calabresa e cebola" and the note "Bem assada"
- **THEN** the items appear on the order with their quantities, status and per-line totals
- **AND** while the order is open more items can be added

#### Scenario: An unavailable item cannot be added

- **WHEN** the manager opens the delivery order of "Maria Souza" whose menu shows the item "Calabresa" as unavailable
- **THEN** the item tile is disabled and marked "Indisponível"

#### Scenario: Advancing a delivery order

- **WHEN** the manager advances the delivery order of "Maria Souza"
- **THEN** the order moves to the next step — "Preparing" from "Open", then "Out for delivery", then "Delivered"
- **AND** each advance is refused with the backend's message as-is when the transition is invalid

#### Scenario: A delivered order is final

- **WHEN** the manager views the delivered delivery order of "Maria Souza"
- **THEN** the screen shows "Entregue às" with the time recorded at delivery
- **AND** no further status action and no item adding are offered
