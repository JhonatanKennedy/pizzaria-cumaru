## Why

Every request today carries a 1-hour JWT that the SPA keeps in `localStorage`
(`auth-storage.ts:48`). That is the worst pairing of the two properties a bearer
credential can have: **readable** — any injected script copies it out and uses it
from another machine — and **long-lived**, so a copy stays good for the rest of the
hour even after the tab is closed.

Fixing the first property means the browser must hold the credential somewhere page
JS cannot read: an HttpOnly cookie set by the API. Fixing the second means the
credential has to be short-lived. Those two pull against each other — a 5-minute
token alone would log the waiter out mid-shift — and a refresh token is what
reconciles them: the long-lived secret stays in the HttpOnly cookie, the short-lived
one lives in memory and dies quickly.

## What Changes

- **Login splits the session in two.** `POST /auth/login` returns a short-lived
  access token in the body and sets a refresh token in an HttpOnly cookie.
  **BREAKING**: the response field `token` becomes `accessToken` — every client,
  the seven e2e suites included, reads it today.
- **`POST /auth/refresh` is new.** It verifies the refresh cookie, rotates it
  (the previous `jti` is denylisted), and returns a new access token. A replayed
  refresh token is refused.
- **Logout authenticates by the cookie, not the header.** It denylists the refresh
  `jti` and clears the cookie. It stops depending on a still-valid access token, so
  a user whose access token expired while idle can still log out cleanly.
- **A refresh token can never act as an access token.** Tokens are signed with a
  separate secret and carry a `typ` claim that `RolesGuard` refuses, so holding the
  cookie does not grant access to any endpoint.
- **CORS gains `credentials: true`.** This is the flip the `restrict-cors-origins`
  design recorded as belonging to this change — `Access-Control-Allow-Origin: *`
  and credentialed requests are mutually exclusive, which is why that allowlist has
  to land first.
- **The SPA keeps the access token in memory only.** `localStorage` stops holding
  any credential: a reload calls `/auth/refresh` before the first render, and a 401
  triggers one refresh-and-retry rather than an immediate logout.
- **`cookie-parser` is added** — there is no dependency today that reads a `Cookie`
  header.
- **`features/01_authentication.feature` gains scenarios** for the session surviving
  a reload and for logout ending it.

## Capabilities

### New Capabilities

- `users/session-refresh`: how a session is kept alive across requests — the two
  token lifetimes and where each is held, rotation on refresh and what happens to a
  replayed token, and the invariant that the refresh token authorizes nothing. Sits
  beside `users/authentication`, which owns the credentials and the login itself.

### Modified Capabilities

- `users/authentication`: a successful login now also establishes a refreshable
  session (observable: the response sets a cookie), and logout now ends that session
  by revoking the refresh token and clearing the cookie, rather than relying on the
  caller presenting a still-valid access token.

## Impact

- `src/users/application/use-cases/` — `authenticate-user.ts` (issue both tokens),
  `logout-user.ts` (read the refresh token, not the bearer), plus a new
  `refresh-session.ts`.
- `src/users/presentation/controllers/auth.controller.ts` — `POST /auth/refresh`
  (`@Public()`, authenticated by the cookie), cookie set/clear on login and logout.
- `src/common/guards/roles.guard.ts` — refuse tokens whose `typ` is not `access`.
- `src/users/users.module.ts` — the refresh secret for the second `JwtModule`.
- `src/config/cors.ts` — `credentials: true` (file created by `restrict-cors-origins`).
- `src/config/env.validation.ts`, `.env.example` — `JWT_REFRESH_SECRET`.
- `apps/web/src/api/http-client.ts` — in-memory access token,
  `credentials: 'include'` on the auth calls, single-flight refresh-and-retry.
- `apps/web/src/pages/auth/` — `auth-storage.ts` stops storing the token; the app
  boot path refreshes before the first render.
- `apps/api/test/auth.e2e-spec.ts` and the six other e2e suites — login helpers and
  the `token` → `accessToken` rename.
- `features/01_authentication.feature` — new scenarios.
- Observable change: a browser session now survives a reload through a cookie rather
  than through `localStorage`, and `localStorage` no longer contains a credential.
- **Blocked by `restrict-cors-origins`,** which is written but unimplemented — its
  origin allowlist and `CORS_ORIGINS` variable are what make `credentials: true`
  legal. Applying this first would leave login unable to set its cookie.
- **Not in scope:** TLS. The refresh cookie is sent `Secure` only when
  `NODE_ENV=production`, and over plain HTTP a `Secure` cookie is dropped by the
  browser — so production needs TLS before this works there. Also out of scope:
  reuse detection (a replayed token is refused, but it does not revoke the session —
  no schema change), the account-lockout availability problem, and any CSRF token
  (`Path=/auth` plus `SameSite=Lax` is what closes that).
