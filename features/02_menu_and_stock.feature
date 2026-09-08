Feature: Menu and ingredient stock management
  As a manager
  I want to keep the menu and the ingredient stock up to date
  To ensure the kitchen and the waiters see the real availability of the items

  Background:
    Given the menu has the pizzas "Calabresa", "Mussarela", "Portuguesa" and "Quatro Queijos", which require preparation
    And the menu has the dishes "Parmegiana de Frango" and "Parmegiana de Carne", which require preparation
    And the menu has the drinks "Refrigerante Lata", "Suco Natural" and "Água", which do not require preparation

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

  Scenario: Manager updates the price of a menu item
    Given the manager "ana.gerente" is authenticated
    When she changes the price of the pizza "Calabresa" to "R$ 45.00"
    Then new orders with the pizza "Calabresa" must consider the value "R$ 45.00"

  Scenario: Manager adds a new item to the menu
    Given the manager "ana.gerente" is authenticated
    When she registers the pizza "Calabresa Especial" with the price "R$ 55.00" depending on the ingredient "Mussarela"
    Then the pizza "Calabresa Especial" must appear in the menu with the price "R$ 55.00"
    And it must be available to the waiter while "Mussarela" is in stock

  Scenario: The system refuses a repeated item name
    When the manager "ana.gerente" tries to register a second menu item named "Calabresa"
    Then the system must refuse the operation
    And the message "Item name already in use" must be displayed

  Scenario: Manager edits a menu item
    When the manager "ana.gerente" renames the pizza "Calabresa" to "Calabresa Reforçada"
    Then the menu must show "Calabresa Reforçada"
    And the kitchen queue must display "Calabresa Reforçada" for that item

  Scenario: Manager links an ingredient to a dish
    Given the dish "Parmegiana de Frango" does not depend on "Mussarela"
    When the manager "ana.gerente" links the ingredient "Mussarela" to the dish "Parmegiana de Frango"
    Then the dish "Parmegiana de Frango" must be unavailable whenever "Mussarela" is unavailable
    And it must become available again when "Mussarela" is restored

  Scenario: Manager unlinks an ingredient from a dish
    Given the ingredient "Mussarela" is unavailable in stock
    And the dish "Parmegiana de Frango" depends on "Mussarela"
    When the manager "ana.gerente" unlinks the ingredient "Mussarela" from the dish "Parmegiana de Frango"
    Then the dish "Parmegiana de Frango" must become available again

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
