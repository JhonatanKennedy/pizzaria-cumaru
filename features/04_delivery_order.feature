Feature: Delivery orders via WhatsApp
  As the waiter/attendant responsible for delivery
  I want to register in the system the orders received via WhatsApp
  To reduce the friction between local service and delivery

  Background:
    Given the waiter "joao.garcom" is authenticated

  Scenario: Create a delivery order from a WhatsApp message
    When the waiter creates a new order of type "Delivery" for the customer "Maria Souza"
    And informs the contact phone "(81) 99999-0000" and the delivery address
    Then an order of type "Delivery" with status "Open" must be created
    And the order must not be linked to any table

  Scenario: Add varied items to a delivery order
    Given there is an open delivery order for the customer "Maria Souza"
    When the waiter adds a pizza "Portuguesa" with the additional flavor "Calabresa"
    And adds a drink "Refrigerante Lata"
    And adds the observation "deliver without ringing the doorbell, leave it at the front desk"
    Then the delivery order must contain the items and observations informed

  Scenario: Delivery order requires a delivery address
    When the waiter tries to create a "Delivery" order without informing the address
    Then the system must refuse the order creation
    And the message "Delivery address is required for delivery" must be displayed

  Scenario Outline: Status cycle of a delivery order
    Given there is a delivery order with status "<current_status>" for the customer "Maria Souza"
    When the order is marked as "<new_status>"
    Then the order status must be "<new_status>"

    Examples:
      | current_status    | new_status        |
      | Open              | Preparing         |
      | Preparing         | Out for delivery  |
      | Out for delivery  | Delivered         |

  Scenario: Record the delivery time when finishing the order
    Given there is a delivery order with status "Out for delivery" for the customer "Maria Souza"
    When the order is marked as "Delivered"
    Then the delivery time must be recorded in the order
