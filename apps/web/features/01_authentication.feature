Feature: Profile authentication
  As a system user (manager, waiter or cook)
  I want to authenticate with my credentials
  To access the features specific to my profile

  Background:
    Given there is a registered user with profile "Manager", login "ana.gerente" and password "SenhaSegura123"
    And there is a registered user with profile "Waiter", login "joao.garcom" and password "SenhaSegura123"
    And there is a registered user with profile "Cook", login "carlos.cozinha" and password "SenhaSegura123"

  Scenario Outline: Successful login redirects to the correct profile screen
    When the user "<login>" authenticates with the password "<password>"
    Then access must be granted
    And the user must be redirected to the "<screen>" screen

    Examples:
      | login          | password       | screen                  |
      | ana.gerente    | SenhaSegura123 | Manager Panel           |
      | joao.garcom    | SenhaSegura123 | Waiter Panel            |
      | carlos.cozinha | SenhaSegura123 | Kitchen Panel           |

  Scenario: Login attempt with invalid password
    When the user "joao.garcom" authenticates with the password "senhaErrada"
    Then access must be denied
    And the message "Invalid username or password" must be displayed

  Scenario: Temporary block after repeated login attempts
    When the user "joao.garcom" tries to authenticate with an incorrect password 5 times in a row
    Then the account must be temporarily blocked
    And the message "Account locked. Try again in 15 minutes" must be displayed

  Scenario: Each profile only accesses the screens allowed to its role
    Given the user "joao.garcom" is authenticated as "Waiter"
    When he tries to access the "Daily Earnings Report" screen
    Then access must be denied
    And the message "Access not authorized for your profile" must be displayed

  Scenario: End session
    Given the user "carlos.cozinha" is authenticated
    When he logs out
    Then the session must be ended
    And he must be redirected to the login screen
