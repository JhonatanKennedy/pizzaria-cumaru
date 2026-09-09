## Purpose

The manager's menu and stock management: keep the menu items and the ingredient stock up to date so the kitchen and the waiters see the real availability. Traces to `features/02_menu_and_stock.feature`.

## ADDED Requirements

### Requirement: Manage the menu

The manager MUST see the menu and keep it up to date from a single screen.

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
- **WHEN** the manager renames an item or changes its description
- **THEN** the menu shows the updated item

#### Scenario: Updating an item price
- **WHEN** the manager changes the price of an item
- **THEN** the menu shows the new price

#### Scenario: Removing an item
- **WHEN** the manager removes an item
- **THEN** the item no longer appears in the menu

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
