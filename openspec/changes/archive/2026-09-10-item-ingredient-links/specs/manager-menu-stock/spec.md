## ADDED Requirements

### Requirement: Link ingredients to items

Every menu item MUST expose which ingredients it uses, and the manager MUST be able to attach ingredients when registering an item and manage the links of an existing item from the Menu and stock screen. Both paths go through a single item request carrying the whole `ingredientIds` list, replacing the links wholesale. An item's availability MUST be derived from its links — an item is available only while every linked ingredient is available — and the screen MUST reflect that derivation (marking a linked ingredient out of stock flips the dependent item unavailable on the same screen).

#### Scenario: Registering a new item with ingredients

- **WHEN** the manager registers the pizza "Calabresa" with "Mussarela" and "Calabresa a granel" checked in the "Ingredientes" fieldset
- **THEN** the item is created with both ingredient links
- **AND** the Menu and stock screen lists "Calabresa" with the two linked ingredients

#### Scenario: Managing an item's ingredient links

- **WHEN** the manager opens "Editar" on the item "Calabresa"
- **THEN** the dialog shows the item form with the linked ingredients already checked in the "Ingredientes" fieldset
- **AND** saving sends the updated ingredient list along with name, description, price and preparation flag in one request

#### Scenario: Linking an out-of-stock ingredient

- **WHEN** the manager links the unavailable ingredient "Tomate" to the pizza "Margherita"
- **THEN** the link is saved and the pizza becomes unavailable until "Tomate" is back in stock

#### Scenario: The save fails on the backend

- **WHEN** the backend refuses the item update
- **THEN** the dialog shows the backend message as-is in a form-level alert
- **AND** the dialog stays open with the manager's input intact, ready to retry
