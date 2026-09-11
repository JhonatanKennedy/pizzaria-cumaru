## Purpose

Defines which browser origins may call the API, so a script on another site cannot drive its endpoints on a visitor's behalf and read the answers.

## ADDED Requirements

### Requirement: Only allowlisted origins are answered
The API SHALL reflect `Access-Control-Allow-Origin` only for an origin present in its configured allowlist. A request from an origin absent from the list SHALL receive no permissive CORS header, so a browser at that origin cannot read the response, and SHALL NOT be turned into a server error.

#### Scenario: An allowlisted origin is answered
- **WHEN** a request arrives from an origin on the allowlist
- **THEN** the response carries that origin in `Access-Control-Allow-Origin`

#### Scenario: An origin off the list is not answered
- **WHEN** a browser at an origin not on the allowlist makes a request
- **THEN** the response carries no `Access-Control-Allow-Origin` for it, and the request is not refused as a server error

#### Scenario: A caller that sends no origin is unaffected
- **WHEN** a request arrives with no `Origin` header, as a command-line client or a test harness sends
- **THEN** the request is neither allowed nor refused by the origin policy, because the policy is a browser protocol

### Requirement: The allowlist is configuration
The allowlist SHALL be read from a single `CORS_ORIGINS` environment variable holding a comma-separated list of origins. Entries SHALL be trimmed and empty entries discarded. No source file SHALL select the allowlist by branching on the environment.

#### Scenario: Several origins
- **WHEN** `CORS_ORIGINS` holds two comma-separated origins
- **THEN** a request from either origin is answered

#### Scenario: Whitespace and empty entries are discarded
- **WHEN** `CORS_ORIGINS` holds origins separated by commas with surrounding spaces or trailing commas
- **THEN** each origin is read without surrounding whitespace and no empty entry is kept

### Requirement: The wildcard is refused
A `CORS_ORIGINS` value containing `*` SHALL be refused, and the system SHALL NOT fall back to a permissive allowlist when it is.

#### Scenario: A wildcard entry is refused
- **WHEN** `CORS_ORIGINS` contains `*`
- **THEN** the system refuses the value rather than answering every origin

### Requirement: Production fails closed
When the application runs in production, it SHALL refuse to start if `CORS_ORIGINS` is missing, naming the variable. It SHALL NOT start with an empty, defaulted, or permissive allowlist.

#### Scenario: Production starts without the variable
- **WHEN** the application runs in production and `CORS_ORIGINS` is not set
- **THEN** it refuses to start and the error names the missing variable

#### Scenario: No default allowlist is applied in production
- **WHEN** the application starts in production
- **THEN** the allowlist is exactly the configured value, with no origin admitted that the operator did not set

### Requirement: Development fails loudly rather than blocking silently
When the application runs in development, it SHALL refuse to start if `CORS_ORIGINS` is missing, naming the variable, rather than starting with an allowlist that silently blocks the single-page application.

#### Scenario: Development starts without the variable
- **WHEN** the application runs in development and `CORS_ORIGINS` is not set
- **THEN** it refuses to start and the error names the missing variable

### Requirement: Credentials are not enabled for a bearer-token API
The API SHALL NOT grant `Access-Control-Allow-Credentials` while it authenticates requests solely with a bearer token. Enabling it SHALL accompany the introduction of a cookie-based credential and SHALL never be combined with a wildcard allowlist.

#### Scenario: A preflight asking for credentials is not granted them
- **WHEN** a browser sends a preflight request carrying credentials from an allowlisted origin
- **THEN** the response does not grant credentialed cross-origin access
