Feature: Table orders (local service)
  As a waiter
  I want to register items in an order per table
  So that all the items ordered by a table stay in a single order until closing

  Background:
    Given the waiter "joao.garcom" is authenticated
    And table "5" is free

  Scenario: Open a new order for a table
    When the waiter opens an order for table "5"
    Then a single order of type "Local" linked to table "5" must be created
    And the order must record which waiter opened it
    And the order status must be "Open"

  Scenario: Add multiple items to the open table order over the course of the service
    Given there is an open order for table "5"
    When the waiter adds a pizza "Calabresa" to the order of table "5"
    And, later, adds a "Água" to the order of table "5"
    And, even later, adds a dish "Parmegiana de Frango" to the order of table "5"
    Then the order of table "5" must contain the 3 items added
    And there must continue to be only one order for table "5"

  Scenario: Order a pizza with more than one flavor in the same order
    Given there is an open order for table "5"
    When the waiter adds a pizza split with the flavors "Calabresa" and "Portuguesa"
    Then the pizza item must record the flavors "Calabresa, Portuguesa"
    And the price of the pizza must be calculated according to the multi-flavor pizza rule

  Scenario: Add observations to an order item
    Given there is an open order for table "5"
    When the waiter adds a pizza "Mussarela" with the observation "no onions, stuffed crust"
    Then the item recorded must contain the observation "no onions, stuffed crust"

  Scenario: It is not possible to add items to a closed order
    Given the order of table "5" has status "Closed"
    When the waiter tries to add a drink "Suco Natural" to the order of table "5"
    Then the system must refuse the operation
    And the message "Cannot change a closed order" must be displayed

  Scenario Outline: Different tables keep independent orders
    Given there is an open order for table "<table_a>"
    And there is an open order for table "<table_b>"
    When the waiter adds an item to the order of table "<table_a>"
    Then the order of table "<table_b>" must not be changed

    Examples:
      | table_a | table_b |
      | 5       | 6       |
      | 2       | 9       |

  Scenario: Adjust the quantity of an item in the course of the service
    Given there is an open order for table "5" with an "Água"
    When the waiter increases the quantity of the "Água" from "1" to "3"
    Then the order of table "5" must record the "Água" with quantity "3"
    And when the waiter decreases the quantity of the "Água" to "1"
    Then the order of table "5" must record the "Água" with quantity "1"

  Scenario: Adjust the quantity of an item that is in preparation
    Given there is an open order for table "5" with a pizza "Calabresa" that the kitchen is preparing
    When the waiter increases the quantity of the pizza "Calabresa" from "1" to "2"
    Then the order of table "5" must record the pizza "Calabresa" with quantity "2"

  Scenario: It is not possible to adjust items of a closed order
    Given the order of table "5" has status "Closed"
    When the waiter tries to change the quantity of an item of the order of table "5"
    Then the system must refuse the operation
    And the message "Cannot change a closed order" must be displayed

  Scenario: Open a new order for a table whose order was cancelled
    Given there is an open order for table "5"
    When the waiter cancels the order of table "5"
    And opens a new order for table "5"
    Then an order of type "Local" linked to table "5" must be created

  # The closing of the table order is done by the Manager — see 07_manager_profile.feature
