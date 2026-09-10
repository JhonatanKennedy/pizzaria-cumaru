Feature: Menu and ingredient stock management
  As a manager
  I want to keep the menu and the ingredient stock up to date
  To ensure the kitchen and the waiters see the real availability of the items

  Background:
    Given the menu has the pizzas "Calabresa", "Mussarela", "Portuguesa" and "Quatro Queijos", which require preparation
    And the menu has the dishes "Parmegiana de Frango" and "Parmegiana de Carne", which require preparation
    And the menu has the drinks "Refrigerante Lata", "Suco Natural" and "Água", which do not require preparation

  Scenario: Manager lists the menu with category, price and availability
    Given the manager "ana.gerente" is authenticated
    When she opens the "Menu and stock" screen
    Then every menu item must be listed with its category, its price and its availability

  Scenario: Manager filters the items by category
    Given the manager "ana.gerente" is authenticated
    When she picks the "Pizzas" category chip in the items tab
    Then only the pizzas must be listed
    When she picks the "Todas" chip
    Then every menu item must be listed again

  Scenario: One edit action per row
    Given the manager "ana.gerente" is authenticated
    When she views an item row in the items tab
    Then the row must offer a single "Editar" action plus "Excluir"
    And the separate "Preço" and "Ingredientes" actions must not exist

  Scenario: Items that do not require preparation never enter the kitchen flow
    Given the drink "Água" does not require preparation
    When an order is created with the drink "Água"
    Then this item must not generate any preparation status
    And it must not appear in any Kitchen Panel queue

  Scenario: Manager marks an ingredient as missing
    Given the manager "ana.gerente" is authenticated
    When she marks the ingredient "Mussarela" as unavailable in stock
    Then all menu items that depend on "Mussarela" must become unavailable

  Scenario: Item disappears from the kitchen screen when the ingredient is missing
    Given the ingredient "Mussarela" is unavailable in stock
    When the cook "carlos.cozinha" accesses the queue of dishes to prepare
    Then no item that depends on "Mussarela" must appear in the kitchen queue

  Scenario: Item appears as unavailable on the waiter screen when the ingredient is missing
    Given the ingredient "Mussarela" is unavailable in stock
    When the waiter "joao.garcom" opens the new order screen
    Then the pizza "Mussarela" must appear marked as "Unavailable"
    And he must not be able to add it to an order

  Scenario: Manager restores the availability of an ingredient
    Given the ingredient "Mussarela" is unavailable in stock
    When the manager "ana.gerente" marks the ingredient "Mussarela" as available again
    Then the items that depend on "Mussarela" must appear normally again for the waiter and for the kitchen

  Scenario: Manager adds a new item to the menu
    Given the manager "ana.gerente" is authenticated
    When she registers the pizza "Calabresa Especial" with the price "R$ 55.00" depending on the ingredient "Mussarela"
    Then the pizza "Calabresa Especial" must appear in the menu with the price "R$ 55.00"
    And it must be available to the waiter while "Mussarela" is in stock

  Scenario: The system refuses a repeated item name
    When the manager "ana.gerente" tries to register a second menu item named "Calabresa"
    Then the system must refuse the operation
    And the message "Item name already in use" must be displayed

  Scenario: The system refuses a negative price
    When the manager "ana.gerente" tries to update the pizza "Calabresa" with the price "-R$ 5.00"
    Then the system must refuse the operation
    And the message "Price cannot be negative" must be displayed

  Scenario: Manager updates the price of an item through its "Editar" dialog
    Given the manager "ana.gerente" is authenticated
    When she changes the price of the pizza "Calabresa" to "R$ 45.00" inside its "Editar" dialog
    Then the menu must show the pizza "Calabresa" with the price "R$ 45.00"
    And new orders with the pizza "Calabresa" must consider the value "R$ 45.00"

  Scenario: Manager changes everything about an item in one request through its "Editar" dialog
    Given the manager "ana.gerente" is authenticated
    When she edits the pizza "Calabresa" through its "Editar" dialog, pre-filled with the item's name, description, price, preparation flag and linked ingredients
    And she changes its name to "Calabresa Reforçada", its description, its price to "R$ 48.00" and its preparation flag at once
    Then the menu must show "Calabresa Reforçada" with the new description, price and preparation flag
    And the kitchen queue must display "Calabresa Reforçada" for that item
    And new orders with the pizza "Calabresa Reforçada" must consider the value "R$ 48.00"

  Scenario: An item keeps the category it was created with
    When the manager "ana.gerente" tries to update the pizza "Calabresa" with the category "Drink"
    Then the pizza "Calabresa" must remain in the menu as a pizza

  Scenario: Manager links an ingredient to a dish with a single update
    Given the dish "Parmegiana de Frango" does not depend on "Mussarela"
    When the manager "ana.gerente" updates the dish "Parmegiana de Frango" through its "Editar" dialog, selecting the ingredient "Mussarela"
    Then the dish "Parmegiana de Frango" must be unavailable whenever "Mussarela" is unavailable
    And it must become available again when "Mussarela" is restored

  Scenario: Manager unlinks an ingredient from a dish with a single update
    Given the ingredient "Mussarela" is unavailable in stock
    And the dish "Parmegiana de Frango" depends on "Mussarela"
    When the manager "ana.gerente" updates the dish "Parmegiana de Frango" through its "Editar" dialog, deselecting the ingredient "Mussarela"
    Then the dish "Parmegiana de Frango" must become available again

  Scenario: Kitchen items demand the preparation flag
    When the manager "ana.gerente" tries to register or edit an item of category "Pizzas" or "Pratos" with the "Exige preparo" flag unchecked
    Then the form must refuse to save
    And the message `Pizzas e pratos exigem "Exige preparo"` must be displayed

  Scenario: Picking a kitchen category pre-checks the flag
    When the manager "ana.gerente" chooses the category "Pizzas" or "Pratos" in the item form
    Then the "Exige preparo" checkbox must be checked for that item

  Scenario: Manager removes an item from the menu
    Given an open order contains the pizza "Calabresa"
    When the manager "ana.gerente" removes the pizza "Calabresa" from the menu
    Then the pizza "Calabresa" must no longer appear in the menu nor in the kitchen queue
    And the order that contains it must remain "Open" with its items intact

  Scenario: Manager registers a new ingredient
    When the manager "ana.gerente" registers the ingredient "Catupiry"
    Then "Catupiry" must appear in the ingredient listing, available

  Scenario: The system refuses a repeated ingredient name
    When the manager "ana.gerente" tries to register a second ingredient named "Mussarela"
    Then the system must refuse the operation
    And the message "Ingredient name already in use" must be displayed

  Scenario: Manager renames an ingredient
    When the manager "ana.gerente" renames the ingredient "Mussarela" to "Muçarela"
    Then the ingredient listing must show "Muçarela"
    And the items that depend on "Mussarela" must keep their availability

  Scenario: Manager removes an ingredient
    Given the ingredient "Mussarela" is the only ingredient the pizza "Calabresa" depends on
    When the manager "ana.gerente" removes the ingredient "Mussarela"
    Then "Mussarela" must no longer appear in the ingredient listing
    And the pizza "Calabresa" must remain on the menu and available
