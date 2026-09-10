## ADDED Requirements

### Requirement: Link ingredients to items

Every menu item MUST expose which ingredients it uses, and the manager MUST be able to attach ingredients when registering an item and manage the links of an existing item from the Menu and stock screen. An item's availability MUST be derived from its links — an item is available only while every linked ingredient is available — and the screen MUST reflect that derivation (marking a linked ingredient out of stock flips the dependent item unavailable on the same screen).

#### Scenario: Registering a new item with ingredients

- **WHEN** the manager registers the pizza "Calabresa" with the ingredients "Mussarela" and "Calabresa a granel" attached
- **THEN** the item is created with both ingredient links
- **AND** the Menu and stock screen lists "Calabresa" with the two linked ingredients

#### Scenario: Managing an item's ingredient links

- **WHEN** the manager opens the "Ingredientes" action of the item "Calabresa"
- **THEN** the dialog lists every ingredient with the linked ones already checked
- **AND** toggling an ingredient links or unlinks it through the backend, with the row busy until the request settles

#### Scenario: Linking an out-of-stock ingredient

- **WHEN** the manager links the unavailable ingredient "Tomate" to the pizza "Margherita"
- **THEN** the link is saved and the pizza becomes unavailable until "Tomate" is back in stock

#### Scenario: A link operation fails on the backend

- **WHEN** the backend refuses a link or unlink request
- **THEN** the dialog shows the backend message as-is
- **AND** the toggle stays in its previous state, ready to retry
