# User Session Refresh Specification

## Purpose

Defines how a signed-in session is kept alive between requests: the two tokens a
session is made of and where each one is held, how a client obtains a new access
token without the user re-entering credentials, and why a refresh token can never
stand in for an access token.

## Requirements

### Requirement: A session carries two tokens with different lifetimes
A signed-in session SHALL consist of a short-lived access token that the client presents on each request, and a longer-lived refresh token whose only purpose is to obtain new access tokens. The access token's lifetime SHALL be shorter than the refresh token's.

#### Scenario: Login returns an access token and establishes a refresh token
- **WHEN** a user authenticates successfully
- **THEN** the response carries a short-lived access token and a longer-lived refresh token is established for the session

#### Scenario: The access token expires while the session continues
- **WHEN** a session's access token lifetime elapses but its refresh token is still current
- **THEN** the session can be continued by refreshing, without the user authenticating again

#### Scenario: The refresh token expires
- **WHEN** a session's refresh token lifetime elapses
- **THEN** refreshing is refused and the user authenticates again

### Requirement: The refresh token is held where page scripts cannot read it
The refresh token SHALL be delivered as an HttpOnly cookie, SHALL NOT appear in any response body, and SHALL be attached by the browser only to the session endpoints.

#### Scenario: Login delivers the refresh token as an unreadable cookie
- **WHEN** a user authenticates successfully
- **THEN** the refresh token is set as an HttpOnly cookie and appears in no response body

#### Scenario: The cookie is not attached to ordinary requests
- **WHEN** the browser calls an endpoint outside the session endpoints
- **THEN** the refresh cookie is not attached to the request

#### Scenario: Production only returns the cookie over a secure channel
- **WHEN** the system runs in production
- **THEN** the refresh cookie is marked Secure, so a browser returns it only over a secure connection

### Requirement: Refreshing rotates the refresh token
Each refresh SHALL issue a new refresh token and SHALL stop accepting the one it replaced, so a refresh token is usable at most once.

#### Scenario: A successful refresh
- **WHEN** a client presents a current refresh token
- **THEN** a new access token and a new refresh token are issued

#### Scenario: The replaced token stops working
- **WHEN** a client presents the refresh token that an earlier refresh replaced
- **THEN** the request is refused

#### Scenario: No refresh token presented
- **WHEN** a refresh is attempted without a refresh token
- **THEN** the request is refused

### Requirement: A refresh token that is no longer current is refused
The system SHALL refuse a refresh token that has been replaced by rotation or revoked by signing out.

#### Scenario: Refreshing with a token from an ended session
- **WHEN** a refresh is attempted with the refresh token of a session that has ended
- **THEN** the request is refused

### Requirement: The refresh token authorizes nothing
A refresh token SHALL be accepted only by the refresh operation. It SHALL NOT grant access to any other endpoint, and presenting one where an access token is expected SHALL be refused.

#### Scenario: Refresh token presented where an access token is expected
- **WHEN** a request carries a refresh token in place of an access token
- **THEN** the request is refused

#### Scenario: Refresh cookie alone does not authorize an endpoint
- **WHEN** a request to an endpoint other than the session endpoints carries only the refresh cookie
- **THEN** the request is refused

### Requirement: An expired access token is renewed without the user noticing
The client SHALL renew an expired access token automatically and SHALL end the session only when renewal is refused.

#### Scenario: Reloading the application keeps the session
- **WHEN** a signed-in user reloads the application
- **THEN** the session continues without the user authenticating again

#### Scenario: A refused renewal ends the session
- **WHEN** renewal is refused
- **THEN** the session ends and the user is returned to the login screen
