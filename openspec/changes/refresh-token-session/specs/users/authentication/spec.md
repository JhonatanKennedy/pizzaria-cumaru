## MODIFIED Requirements

### Requirement: Successful login
The system SHALL grant access when a user authenticates with a valid login and password, and SHALL establish a session that can be continued after its access token expires.

#### Scenario: Valid credentials
- **WHEN** the user "joao.garcom" authenticates with the correct password
- **THEN** access is granted and the authenticated identity is the user "joao.garcom" with role "Waiter"

#### Scenario: Login establishes a continuable session
- **WHEN** the user "joao.garcom" authenticates with the correct password
- **THEN** a refresh token is established for the session, held where page scripts cannot read it

### Requirement: Logout ends the session
The system SHALL end the session when the user logs out, revoking the session's refresh token so it can no longer be used. Requests using the ended session SHALL be refused.

#### Scenario: Logout
- **WHEN** the authenticated user "carlos.cozinha" logs out
- **THEN** the session is ended and subsequent requests with it are refused

#### Scenario: Logout does not depend on a valid access token
- **WHEN** the user "carlos.cozinha" logs out after his access token has expired
- **THEN** the session still ends and its refresh token is revoked
