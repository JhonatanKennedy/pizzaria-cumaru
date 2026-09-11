## REMOVED Requirements

### Requirement: Credentials are not enabled for a bearer-token API
**Reason**: The prohibition was conditional on the API authenticating requests solely with a bearer token, and it named the condition that would lift it: "Enabling it SHALL accompany the introduction of a cookie-based credential." This change introduces exactly that credential — the session's refresh token is held in an HttpOnly cookie — so the prohibition no longer applies and its precondition cannot be restored without removing the session.
**Migration**: None for callers. The allowlist is unchanged, so a credentialed request succeeds for an origin the API already answered and is still granted nothing off the list. What changes is that an allowlisted origin may now read a response carrying `Set-Cookie`; no origin gains access that did not have it.

## ADDED Requirements

### Requirement: Credentials are granted only alongside a cookie-based credential
The API SHALL grant `Access-Control-Allow-Credentials` because a session credential is carried in a cookie, and SHALL grant it only together with an origin it reflects. It SHALL never grant credentialed access to an origin off the allowlist, and SHALL never combine it with a wildcard.

#### Scenario: An allowlisted origin is granted credentials
- **WHEN** a browser sends a preflight request carrying credentials from an allowlisted origin
- **THEN** the response grants credentialed cross-origin access to that origin

#### Scenario: An origin off the list is granted nothing
- **WHEN** a browser sends a preflight request carrying credentials from an origin not on the allowlist
- **THEN** the response grants neither that origin nor credentialed cross-origin access
