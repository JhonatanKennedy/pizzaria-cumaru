# User Authentication Specification

## Purpose

Defines how users authenticate with credentials, how repeated failures lock an account temporarily, how sessions end, and that the authenticated identity carries the user's role.

## Requirements

### Requirement: Users have a single role
Every registered user SHALL have exactly one role: "Waiter", "Cook", or "Manager". The authenticated identity SHALL carry that role.

#### Scenario: Registered users carry their role
- **WHEN** a registered user with role "Manager" authenticates successfully
- **THEN** the authenticated identity carries the role "Manager"

### Requirement: Successful login
The system SHALL grant access when a user authenticates with a valid login and password.

#### Scenario: Valid credentials
- **WHEN** the user "joao.garcom" authenticates with the correct password
- **THEN** access is granted and the authenticated identity is the user "joao.garcom" with role "Waiter"

### Requirement: Invalid credentials are refused
The system SHALL deny access when the login or password is invalid, showing the message "Invalid username or password".

#### Scenario: Wrong password
- **WHEN** the user "joao.garcom" authenticates with a wrong password
- **THEN** access is denied with the message "Invalid username or password"

### Requirement: Temporary lockout after repeated failures
The system SHALL block an account temporarily after 5 consecutive failed login attempts, showing the message "Account locked. Try again in 15 minutes". A successful login SHALL reset the failure count.

#### Scenario: Five consecutive failures
- **WHEN** the user "joao.garcom" fails authentication 5 times in a row
- **THEN** the account is temporarily blocked and any further attempt shows "Account locked. Try again in 15 minutes"

#### Scenario: Success resets the count
- **WHEN** the user "joao.garcom" authenticates successfully after 4 failures
- **THEN** the failure count is reset to zero

### Requirement: Logout ends the session
The system SHALL end the session when the authenticated user logs out. Requests using the ended session SHALL be refused.

#### Scenario: Logout
- **WHEN** the authenticated user "carlos.cozinha" logs out
- **THEN** the session is ended and subsequent requests with it are refused
