Feature: Manager profile
  As a manager
  I want full access to the system and to management reports
  To supervise the restaurant operation

  Background:
    Given the manager "ana.gerente" is authenticated

  Scenario Outline: Manager has access to the features of all profiles
    When she accesses the "<screen>" screen
    Then access must be granted

    Examples:
      | screen                |
      | Waiter Panel          |
      | Kitchen Panel         |
      | Manager Panel         |
      | Daily Earnings Report |

  Scenario: Manager registers an order per table as a waiter would
    When she opens a new order for table "10"
    Then the order must be created successfully

  Scenario: Manager confirms a dish as the cook would
    Given there is a dish "Parmegiana de Carne" in the kitchen queue with status "Pending"
    And she starts the preparation of the dish "Parmegiana de Carne"
    When she confirms that the dish is finished
    Then the status of the dish must change to "Ready"

  Scenario: Manager closes a table order
    Given there is an open order for table "10" with items added
    When she closes the order of table "10" informing the payment method "CreditCard"
    Then the order status must change to "Closed"
    And the total value of the order must be calculated and displayed
    And table "10" must become available for a new service

  Scenario: Manager sees which waiter registered each order
    Given the waiter "joao.garcom" opened the order of table "4"
    And the waiter "joao.garcom" created the delivery order of the customer "Maria Souza"
    When the manager accesses the list of the day's orders
    Then each order must display the name of the waiter responsible for having registered it

  Scenario: Manager consults the daily earnings report
    Given 5 local orders were closed totaling "R$ 480.00" in the day
    And 3 delivery orders were completed totaling "R$ 210.00" in the day
    When she accesses the "Daily Earnings Report"
    Then the grand total of "R$ 690.00" must be displayed
    And the total of local orders "R$ 480.00" must be displayed
    And the total of delivery orders "R$ 210.00" must be displayed

  Scenario Outline: Earnings report can be filtered by order type
    Given completed orders of type "<type>" totaling "<value>" in the day
    When she filters the day's report by the type "<type>"
    Then only the total of "<value>" referring to orders of type "<type>" must be displayed

    Examples:
      | type     | value     |
      | Local    | R$ 480.00 |
      | Delivery | R$ 210.00 |
