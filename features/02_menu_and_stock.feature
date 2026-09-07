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
