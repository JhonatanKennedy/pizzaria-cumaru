Feature: Table management
  As a manager
  I want to register, renumber, and remove the restaurant's tables
  So that the waiter can open orders for real tables and see the floor

  Background:
    Given the manager "ana.gerente" is authenticated

  Scenario: Register a table
    When the manager registers table "3"
    Then table "3" must appear in the table listing
    And the listing must show table "3" as free

  Scenario: Register a duplicate table number
    Given table "3" is registered
    When the manager registers table "3" again
    Then the system must refuse the operation
    And the message "Table number already exists" must be displayed

  Scenario: The waiter sees free and occupied tables
    Given table "5" is registered
    And there is an open order for table "5"
    And table "6" is registered
    When the waiter lists the tables
    Then the listing must show table "5" with the id and running total of its open order
    And the listing must show table "6" with no open order

  Scenario: It is not possible to open an order for an unregistered table
    When the waiter opens an order for table "99" which is not registered
    Then the system must refuse the operation
    And the message "Table not found" must be displayed

  Scenario: Renumber a table
    Given table "3" is registered
    When the manager renumbers table "3" to "4"
    Then the listing must show the table with number "4"

  Scenario: Renumber to a duplicate table number
    Given table "3" is registered
    And table "4" is registered
    When the manager renumbers table "3" to "4"
    Then the system must refuse the operation
    And the message "Table number already exists" must be displayed

  Scenario: Remove a free table
    Given table "3" is registered and free
    When the manager removes table "3"
    Then table "3" must no longer appear in the listing

  Scenario: It is not possible to remove a table that has orders
    Given table "3" is registered
    And there is an order for table "3"
    When the manager removes table "3"
    Then the system must refuse the operation
    And the message "Cannot delete a table that has orders" must be displayed

  Scenario: The listing shows the table free again after its order is cancelled
    Given table "5" is registered
    And there is an open order for table "5"
    When the waiter cancels the order of table "5" informing the reason "Customer gave up"
    Then the listing must show table "5" with no open order
