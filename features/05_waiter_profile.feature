Feature: Waiter profile
  As a waiter
  I want to access the features of my profile
  To serve tables and register delivery orders

  Background:
    Given the waiter "joao.garcom" is authenticated

  Scenario: Waiter registers an order per table
    When he opens a new order for table "8"
    Then the order must be created successfully linked to table "8"

  Scenario: Waiter creates a delivery order
    When he creates a new order of type "Delivery" for the customer "Pedro Lima"
    Then the order must be created successfully of type "Delivery"

  Scenario: Waiter cannot close a table order
    Given there is an open order for table "8" with items added
    When he tries to close the order of table "8"
    Then the action must be refused
    And the message "Only the manager can close the order" must be displayed

  Scenario: Waiter does not have access to the daily earnings report
    When he tries to access the "Daily Earnings Report" screen
    Then access must be denied

  Scenario: Items without an ingredient in stock appear as unavailable for the waiter
    Given the ingredient "Mussarela" is unavailable in stock
    When he opens the new order screen
    Then the pizza "Mussarela" must appear marked as "Unavailable"

  Scenario: Waiter follows the preparation status of the dishes he registered
    Given he registered a dish "Parmegiana de Frango" in the order of table "8"
    When the kitchen confirms that the dish "Parmegiana de Frango" is finished
    Then the waiter must see this item with status "Ready" in the order of table "8"
