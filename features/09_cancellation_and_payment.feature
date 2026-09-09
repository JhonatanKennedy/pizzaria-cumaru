Feature: Item cancellation and bill splitting
  As a waiter or manager
  I want to cancel mistaken items and split the table's bill
  To keep correct control of the order before closing

  Background:
    Given there is an open order for table "12" with a pizza "Calabresa" and a "Água"

  Scenario: Cancel an item that requires preparation before preparation starts
    Given the pizza "Calabresa" requires preparation and has status "Pending"
    When the waiter cancels the item "Calabresa" informing the reason "Customer gave up"
    Then the item "Calabresa" must be removed from the order
    And the cancellation reason must be recorded in the order history

  Scenario: It is not possible to cancel an item that is already in preparation
    Given the pizza "Calabresa" requires preparation and has status "Preparing"
    When the waiter tries to cancel the item "Calabresa"
    Then the system must refuse the cancellation
    And the message "Cannot cancel an item in preparation" must be displayed

  Scenario: Cancel an item that does not require preparation at any moment while the order is open
    Given the "Água" does not require preparation and never enters the kitchen flow
    When the waiter cancels the item "Água" informing the reason "Customer gave up"
    Then the item "Água" must be removed from the order, regardless of the progress of the other items

  Scenario: Cancel the whole order because the customer gave up
    Given there is an open order for table "12" with a pizza "Calabresa" that is being prepared and an "Água"
    When the waiter cancels the order of table "12" informing the reason "Customer gave up"
    Then the order of table "12" must be marked as "Cancelled"
    And every item of the order must be removed, including the pizza in preparation
    And the reason "Customer gave up" must be recorded in the order history

  Scenario: It is not possible to cancel an order that is not open
    Given the order of table "12" has status "Closed"
    When the waiter tries to cancel the order of table "12"
    Then the system must refuse the operation
    And the message "Cannot change a closed order" must be displayed

  Scenario: Manager splits the table's bill among more than one person when closing the order
    Given the order of table "12" has a total value of "R$ 120.00"
    When the manager splits the bill into "3" equal parts
    Then each part must have the value of "R$ 40.00"

  # The payment method registration happens when the Manager closes the order — see 07_manager_profile.feature
