# Manager Menu and Stock Specification

## Purpose

The manager's menu and stock management: keep the menu items and the ingredient stock up to date so the kitchen and the waiters see the real availability. Traces to `features/02_menu_and_stock.feature`.

## Requirements

### Requirement: Manage the menu

The manager MUST see the menu and keep it up to date from a single screen. The items tab MUST be browsable by category, and every item edit MUST go through one form like the one used to create the item.

#### Scenario: Listing the menu
- **WHEN** a Manager opens the Menu and stock screen
- **THEN** the screen lists every menu item with its category, price and availability

#### Scenario: Registering a new item
- **WHEN** the manager registers an item with name, description, price, category and preparation flag
- **THEN** the item appears in the menu with the informed price

#### Scenario: Refusing a repeated item name
- **WHEN** the manager registers an item whose name is already in use
- **THEN** the operation is refused and the message "Item name already in use" is displayed

#### Scenario: Editing an item
- **WHEN** the manager edits an item through its "Editar" dialog, pre-filled with the item's name, description, price, preparation flag and linked ingredients
- **THEN** the menu shows the item with every saved change

#### Scenario: Updating an item price
- **WHEN** the manager changes the price of an item inside its edit dialog
- **THEN** the menu shows the new price

#### Scenario: Removing an item
- **WHEN** the manager removes an item
- **THEN** the item no longer appears in the menu

#### Scenario: Filtering the items by category
- **WHEN** the manager picks a category chip in the items tab — "Pizzas", "Pratos", "Bebidas", "Sobremesas" or "Acompanhamentos" — or "Todas" to clear the filter
- **THEN** the list shows only the items of the chosen category

#### Scenario: Kitchen items demand the preparation flag
- **WHEN** the manager registers or edits an item of category "Pizzas" or "Pratos" with the "Exige preparo" flag unchecked
- **THEN** the form refuses to save and shows the validation message `Pizzas e pratos exigem "Exige preparo"`

#### Scenario: Picking a kitchen category pre-checks the flag
- **WHEN** the manager chooses the category "Pizzas" or "Pratos" in the item form
- **THEN** the "Exige preparo" checkbox is checked for that item

#### Scenario: One edit action per row
- **WHEN** the manager views an item row in the items list
- **THEN** the row offers a single "Editar" action plus "Excluir", and the separate "Preço" and "Ingredientes" actions no longer exist

### Requirement: Manage the ingredients

The manager MUST see the ingredient list and control stock.

#### Scenario: Listing the ingredients
- **WHEN** a Manager opens the Menu and stock screen
- **THEN** the screen lists every ingredient with its stock state

#### Scenario: Registering a new ingredient
- **WHEN** the manager registers an ingredient
- **THEN** the ingredient appears in the listing, available

#### Scenario: Refusing a repeated ingredient name
- **WHEN** the manager registers an ingredient whose name is already in use
- **THEN** the operation is refused and the message "Ingredient name already in use" is displayed

#### Scenario: Renaming an ingredient
- **WHEN** the manager renames an ingredient
- **THEN** the listing shows the new name

#### Scenario: Marking an ingredient unavailable
- **WHEN** the manager marks an ingredient as unavailable in stock
- **THEN** the ingredient shows as unavailable and the items that depend on it show as unavailable too

#### Scenario: Restoring an ingredient
- **WHEN** the manager marks an unavailable ingredient as available again
- **THEN** the ingredient and the items that depend on it appear normally again

#### Scenario: Removing an ingredient
- **WHEN** the manager removes an ingredient
- **THEN** the ingredient no longer appears in the listing

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
