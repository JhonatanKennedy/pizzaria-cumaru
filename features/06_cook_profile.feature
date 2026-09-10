Feature: Cook profile
  As a cook
  I want to see only the dishes I need to prepare, organized by order of arrival
  To focus exclusively on kitchen production

  Background:
    Given the cook "carlos.cozinha" is authenticated

  Scenario: Cook screen shows only two queues, by order of arrival
    Given there are open orders for tables "3" and "7", in that order of arrival
    And there is an open delivery order for the customer "Maria Souza", registered before the order of table "3"
    When he accesses the "Kitchen Panel"
    Then he must see the "Delivery" queue with the order of the customer "Maria Souza" in first place
    And he must see the "Local" queue with the orders of tables "3" and "7", in that order

  Scenario: The kitchen screen shows only the dishes, without drinks and other items not prepared by him
    Given the order of table "3" contains a pizza "Calabresa", a dish "Parmegiana de Frango" and a "Água"
    When he views the items of the order of table "3" in the Kitchen Panel
    Then only the pizza "Calabresa" and the dish "Parmegiana de Frango" must be shown
    And the "Água" must not be shown to him

  Scenario: Cook does not have access to the ingredient consultation
    When he tries to access the ingredient consultation of an item
    Then this option must not be available to his profile

  Scenario: Cook confirms that a dish is finished
    Given the dish "Parmegiana de Carne" is in the kitchen queue with status "Pending"
    And he starts the preparation of the dish "Parmegiana de Carne"
    When he confirms that the dish "Parmegiana de Carne" is finished
    Then the status of this dish must change to "Ready"

  Scenario: Finishing a dish does not finish the whole order nor the other items
    Given the order of table "3" contains a pizza "Calabresa" and a dish "Parmegiana de Frango", both "Pending"
    And he starts the preparation of the dish "Parmegiana de Frango"
    When he confirms that the dish "Parmegiana de Frango" is finished
    Then the dish "Parmegiana de Frango" must stay with status "Ready"
    And the pizza "Calabresa" must remain with status "Pending"
    And the order of table "3" as a whole must remain "Open"

  Scenario: Item leaves the kitchen queue when the ingredient is missing
    Given the ingredient "Mussarela" is unavailable in stock
    When he accesses the Kitchen Panel
    Then no item that depends on "Mussarela" must appear in either queue

  Scenario: Cook cancels the preparation of a dish already started
    Given the dish "Parmegiana de Frango" is in the kitchen queue with status "Pending"
    And he starts the preparation of the dish "Parmegiana de Frango"
    When he cancels the preparation of the dish "Parmegiana de Frango", confirming the action without informing a reason
    Then the dish "Parmegiana de Frango" must leave the kitchen queue and the order
    And the order history must record the cancelled item and the cancellation time
    And the order as a whole must remain "Open"
