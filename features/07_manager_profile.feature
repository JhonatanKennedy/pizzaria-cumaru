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
    And every kitchen item of the order has reached "Ready"
    When she closes the order of table "10" informing the payment method "CreditCard"
    Then the order status must change to "Closed"
    And the total value of the order must be calculated and displayed
    And table "10" must become available for a new service

  Scenario: Closing is refused while the kitchen still prepares an item
    Given there is an open order for table "10" with a pizza "Calabresa" that the kitchen is preparing
    When she tries to close the order of table "10" informing the payment method "CreditCard"
    Then the system must refuse the operation
    And the message "Cannot close an order with items in preparation" must be displayed

  Scenario: An order with only non-prepared items closes without waiting for the kitchen
    Given there is an open order for table "10" containing only the drink "Água"
    When she closes the order of table "10" informing the payment method "CreditCard"
    Then the order status must change to "Closed"

  Scenario: The SPA blocks the close while a kitchen item is still in preparation
    Given there is an open order for table "10" whose pizza is still "Pending"
    When she opens the order detail of table "10"
    Then the "Fechar conta" action must be disabled
    And the hint "Ainda há itens em preparação" must be displayed

  Scenario: The manager closes the order once the kitchen finished every item
    Given there is an open order for table "10" whose pizza already reached "Ready"
    And whose "Água" never entered the kitchen flow
    When she opens the order detail of table "10"
    Then the "Fechar conta" action must be available

  Scenario: Manager sees which waiter registered each order
    Given the waiter "joao.garcom" opened the order of table "4"
    And the waiter "joao.garcom" created the delivery order of the customer "Maria Souza"
    When the manager accesses the list of the day's orders
    Then each order must display the name of the waiter responsible for having registered it

  Scenario: Manager lists the day's sales in the daily report
    Given a local order of table "4" was closed with the payment method "Pix" in the day
    And a delivery order of the customer "Maria Souza" was delivered in the day
    And there is an open order and a cancelled order in the day
    When she accesses the "Vendas do Dia" section of the daily report
    Then the 2 sales must be listed newest first, each with its waiter, its payment method when it was closed with one, its sale time, its total and its items
    And the open and cancelled orders must not appear in the listing

  Scenario: Manager filters the day's sales in the daily report
    Given the day's sales include a local sale closed by "Pix", a local sale closed by "CreditCard", a delivery sale, sales with drinks and sales with pizzas
    When she filters the day's sales by the type "Entrega"
    Then only the delivery sale must be listed
    When she filters the day's sales by the payment method "Pix"
    Then only the sale closed by "Pix" must be listed
    When she filters the day's sales by the category "Bebidas"
    Then only the sales that include a drink must be listed

  Scenario: Manager combines and clears the day's sales filters
    Given the day's sales include local and delivery sales with drinks and pizzas
    When she filters the day's sales by the type "Local" and by the category "Bebidas"
    Then only the local sales that include a drink must be listed
    When she clears the category filter
    Then all local sales must be listed again

  Scenario: Manager sees the sold quantities per category
    Given the day's sales include drinks and pizzas
    When she accesses the "Vendas do Dia" section of the daily report
    Then the sold quantities per category must reflect the day's sales
    When she filters the day's sales by the type "Entrega"
    Then the sold quantities per category must reflect only the delivery sales

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
