## ADDED Requirements

### Requirement: Creating a menu item
The system SHALL let a Manager create a menu item with a name, description, price, category, and whether it requires preparation. The new item SHALL appear in the menu listing immediately, with its availability derived from the ingredients it depends on. Creating an item with a name already used by another item SHALL be refused.

#### Scenario: Manager adds a new pizza to the menu
- **WHEN** a Manager creates a pizza "Calabresa Especial" priced "R$ 55.00" that requires preparation and depends on the ingredient "Mussarela"
- **THEN** the pizza appears in the menu listing with price "R$ 55.00" and is available while "Mussarela" is in stock

#### Scenario: Duplicate item name is refused
- **WHEN** a Manager creates a menu item whose name is already used by an existing item
- **THEN** the system refuses the operation with the message "Item name already in use"

### Requirement: Editing a menu item
The system SHALL let a Manager change an item's name and description. The changes SHALL appear wherever the item is shown (menu listing, waiter screens, kitchen queue rows). An item's category SHALL NOT change after creation.

#### Scenario: Manager renames a pizza
- **WHEN** a Manager renames the pizza "Calabresa" to "Calabresa Reforçada"
- **THEN** the menu listing and the kitchen queue show "Calabresa Reforçada" for that item

### Requirement: Managing an item's ingredients
The system SHALL let a Manager link an ingredient to an item and unlink an ingredient from an item. An item SHALL depend on exactly its linked ingredients: linking SHALL make the item unavailable when that ingredient is out of stock, and unlinking SHALL release the item from that dependency.

#### Scenario: Linking an ingredient makes the item follow its stock
- **WHEN** a Manager links the ingredient "Mussarela" to the dish "Parmegiana" and "Mussarela" is later marked unavailable
- **THEN** "Parmegiana" becomes unavailable, and after "Mussarela" is marked available again it becomes available again

#### Scenario: Unlinking an ingredient releases the item from its stock
- **WHEN** a Manager unlinks the ingredient "Mussarela" from the dish "Parmegiana" while "Mussarela" is unavailable
- **THEN** "Parmegiana" is available again

### Requirement: Removing a menu item
The system SHALL let a Manager remove a menu item. A removed item SHALL disappear from the menu listing, SHALL NOT be addable to orders, and SHALL leave the kitchen queues. Orders that already contain the item SHALL remain unchanged and readable.

#### Scenario: Manager removes a dish from the menu
- **WHEN** a Manager removes the dish "Parmegiana de Carne" and an open order already contains it
- **THEN** "Parmegiana de Carne" no longer appears in the menu listing or in any kitchen queue, and the order that contains it stays open with its line items intact

### Requirement: Creating an ingredient
The system SHALL let a Manager create an ingredient with a name. The new ingredient SHALL appear in the ingredient listing. Creating an ingredient with a name already used by another ingredient SHALL be refused.

#### Scenario: Manager registers a new ingredient
- **WHEN** a Manager creates the ingredient "Catupiry"
- **THEN** "Catupiry" appears in the ingredient listing, available

#### Scenario: Duplicate ingredient name is refused
- **WHEN** a Manager creates an ingredient whose name is already used by an existing ingredient
- **THEN** the system refuses the operation with the message "Ingredient name already in use"

### Requirement: Renaming an ingredient
The system SHALL let a Manager rename an ingredient. The new name SHALL appear in the ingredient listing and SHALL NOT change the availability of the items that depend on it.

#### Scenario: Manager renames an ingredient
- **WHEN** a Manager renames the ingredient "Mussarela" to "Muçarela"
- **THEN** the ingredient listing shows "Muçarela" and the items that depend on it keep their availability

### Requirement: Removing an ingredient
The system SHALL let a Manager remove an ingredient. A removed ingredient SHALL disappear from the ingredient listing, and every item that depended on it SHALL stop depending on it — the item stays on the menu and its availability is recomputed from its remaining ingredients.

#### Scenario: Manager removes an ingredient in use
- **WHEN** a Manager removes the ingredient "Mussarela", which is the only ingredient the pizza "Calabresa" depends on
- **THEN** "Mussarela" no longer appears in the ingredient listing, and "Calabresa" remains on the menu and available
