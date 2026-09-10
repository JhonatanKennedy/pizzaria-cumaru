## MODIFIED Requirements

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
