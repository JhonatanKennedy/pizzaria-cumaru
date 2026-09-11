> Task 1.1 is a gate: `restrict-cors-origins` is written but unimplemented, and
> `credentials: true` is illegal against `Access-Control-Allow-Origin: *`. Applied
> first, login cannot set its cookie cross-origin and nothing else here is testable.
> Apply that change before starting this one.

## 1. Prerequisite and configuration

- [x] 1.1 Confirm `restrict-cors-origins` is applied: `apps/api/src/config/cors.ts` exists, `buildCorsOptions` is what `main.ts` passes to `enableCors`, and `CORS_ORIGINS` is read through `ConfigService`; verify by booting the API with `CORS_ORIGINS=http://localhost:5173` and reading the logged allowlist. If any of it is missing, stop and apply that change first
- [x] 1.2 Add `cookie-parser` to `apps/api/package.json` and confirm the install and `npm run build` succeed; verify the dependency appears once in the root lockfile and the build resolves its types without adding `@types/cookie-parser` (1.2 ships its own) — **deviation: 1.4.7 ships no types** (`TS7016`), so `@types/cookie-parser@^1.4.10` was added as a devDependency
- [x] 1.3 Add `JWT_REFRESH_SECRET` to `apps/api/.env.example` with a value that differs from `JWT_SECRET`, and to `apps/api/.env.local` for this checkout (gitignored — not a committed change); verify `npm run dev:api` boots and the two values in `.env.local` are not equal

## 2. Token separation

- [x] 2.1 Give the access and refresh tokens independent verification: sign the refresh token with `JWT_REFRESH_SECRET` and stamp `typ: 'refresh'`, sign the access token with `JWT_SECRET` and `typ: 'access'`, with both lifetimes as named constants (15 minutes, 12 hours — design decision 5); verify a unit spec asserts a refresh token signed this way fails verification against the access secret
- [x] 2.2 Make `RolesGuard` require `typ === 'access'` in addition to its current checks, so a token from the refresh secret can never authorize a request (design decision 1); verify `roles.guard.spec.ts` covers a well-formed access token (accepted), a token whose `typ` is `refresh` (refused), and a token with no `typ` (refused)
- [x] 2.3 Extend `env.validation.ts` to require `JWT_REFRESH_SECRET` in production alongside `DATABASE_URL` and `JWT_SECRET`, and to refuse to boot when it equals `JWT_SECRET` — the case a signature check cannot catch; verify `env.validation.spec.ts` covers missing-in-production, present-and-distinct (passes), and present-but-equal-to-`JWT_SECRET` (refuses, and the message names both variables)

## 3. Issuing the session at login

- [x] 3.1 Update `authenticate-user.ts` to return `accessToken` instead of `token` and to issue the paired refresh token, carrying the refresh token out of the use-case as a separate result field rather than inside the HTTP-facing payload; verify the use-case spec asserts both tokens are issued, the access token's lifetime is the short one, and the result carries the two separately
- [x] 3.2 Set the refresh token as a cookie on the login response via the controller: `HttpOnly`, `Path=/auth`, `SameSite=Lax`, `Secure` only when `isProduction`, `Max-Age` equal to the refresh lifetime (design decision 3); verify an e2e assertion reads each attribute off the `Set-Cookie` header — asserting the flags explicitly, since a flag that is silently absent looks identical to one that works
- [x] 3.3 Confirm no response body contains the refresh token; verify by asserting the login response body has no field whose value equals the refresh token from the cookie

## 4. Refreshing the session

- [x] 4.1 Implement `refresh-session.ts` in `users/application/use-cases/` — verify the cookie's token against the refresh secret, refuse it if its `jti` is denied, denylist that `jti`, and issue a new access/refresh pair (design decision 2). Give it the mandated use-case header with its `Feature:` line (`09-comments.md`); verify unit specs cover a current token (rotates, and the response carries a new pair), a token already rotated away (refused), a token from an ended session (refused), no token at all (refused), and an access token offered in the refresh cookie (refused)
- [x] 4.2 Add `POST /auth/refresh` to `AuthController` as `@Public()`, reading the refresh cookie — `@Public` because the endpoint authenticates by the cookie, not the bearer header; verify an e2e request with the cookie returns a new access token and a new `Set-Cookie`, and one with no cookie is refused
- [x] 4.3 Rewrite `logout-user.ts` to revoke the refresh token it is given, and make it idempotent — a missing, malformed or already-denied token still succeeds, so a client holding a dead cookie can always clear it; verify the use-case spec covers a live token (denylisted), an already-denied token, and a malformed one (all succeed, and the first is actually denied afterwards)
- [x] 4.4 Change `POST /auth/logout` to read the refresh cookie instead of the `authorization` header, keep it `@Public()` for the same reason as 4.2, and have it clear the cookie in its response while clearing it unconditionally (design decision 4); verify an e2e call with a dead access token but a live cookie ends the session and clears the cookie, which is the regression the current guarded logout has

## 5. Credentialed CORS

- [x] 5.1 Set `credentials: true` in `buildCorsOptions` — the flip `restrict-cors-origins` recorded as belonging to this change; verify `cors.spec.ts` asserts `credentials` is true and that the origin callback still refuses an off-list origin by not reflecting it, and that the app still boots with a valid `CORS_ORIGINS`
- [x] 5.2 Confirm the API and SPA remain same-site in development (`localhost:5173` → `localhost:3000`), which is what `SameSite=Lax` depends on; verify a real browser login from the dev server stores the cookie and that it is attached to the `/auth/refresh` request — **verified in the browser on 2026-09-10**: `refresh_token` present with `HttpOnly` + `Path=/auth`, and a `DeniedToken` row written for that token's `jti`. Only rotation and logout write that row, and both read the cookie at `/auth/*`, so either one proves the browser attached it — the row does not record which of the two it was, and this note does not claim one

## 6. Web client

- [x] 6.1 Rework `http-client.ts`: hold the access token in memory instead of reading it per request, send `credentials: 'include'` on the session calls only, and replace the immediate `onUnauthorized` with refresh-once-then-retry, clearing the session only when the refresh itself fails; verify unit specs cover a 401 that refreshes and retries successfully, a 401 whose refresh fails (session cleared), and a request that never sends the refresh cookie
- [x] 6.2 Make the refresh single-flight — one in-flight refresh that concurrent callers await — because rotation refuses the token it replaced, so parallel refreshes would fail and wrongly end the session (design decision 6); verify a spec firing several concurrent 401s asserts exactly one refresh call and no session clear
- [x] 6.3 Update `auth-storage.ts` to stop storing the token while keeping the non-credential user blob, and make a stored blob without a successful refresh not count as a session; verify `auth-storage.spec.ts` covers a stored blob with no token (not a session)
- [x] 6.4 Make boot refresh before the first render: `AuthProvider`'s initial state is currently read synchronously from `localStorage` and `configureApiClient` runs at module scope in `routes/app.tsx`, so both must move behind a pending state that resolves after `/auth/refresh`; verify that reloading a signed-in page keeps the session and that the login screen does not flash first
- [x] 6.5 Keep `DevLogin` working: `loginAsDev` writes a placeholder token the API already rejects, and today it survives a reload only because it lives in `localStorage` — a boot refresh would now fail and log the dev user out (design decision 6). Mark the dev session so boot skips the refresh for it; verify that logging in as a dev role, reloading, and landing back on the same panel still works
- [x] 6.6 Rename `token` → `accessToken` in `loginResponseSchema` and thread it through `auth.api.ts`, `AuthProvider.login` and the logout path; verify `auth.schemas.spec.ts` covers the new field name and the login form's spec still passes

## 7. Product spec

- [x] 7.1 Add scenarios to `features/01_authentication.feature` for the session surviving a reload and for logout ending it even when the access token is stale, following the file's existing Given/When/Then voice and keeping it in English like the rest of `features/`

## 8. Verification

- [x] 8.1 Update all seven e2e suites: the `token` → `accessToken` rename in the login helpers, plus cookie handling where a suite logs out or refreshes. The rename is one atomic step with 3.1 — no intermediate state where the API sends one name and the suites read the other; verify `npm run test:e2e -w apps/api` is green
- [x] 8.2 Verify the no-cookie path by hand against a running API: `curl` to an authenticated endpoint with no cookie and no bearer is refused, and an ordinary request carrying a valid bearer still succeeds — the regression the guard change could introduce
- [x] 8.3 Verify by hand that a refresh token is not an access token: take the `refresh_token` cookie value from a login and send it as `Authorization: Bearer`, and confirm the request is refused
- [x] 8.4 Confirm the denylist behaves: refresh once, then replay the replaced cookie and confirm a 401, while the newest token still refreshes — the rotation guarantee in `users/session-refresh`
- [x] 8.5 Run `npm test` from the root and confirm both apps are green; note that api and web counts both move, and that the web count rises most since 6.1–6.6 add specs
- [x] 8.6 Run `npm run lint` and confirm it is clean. **`npm run format` is never clean repo-wide** — it rewrites the committed Prisma client under `apps/api/src/prisma/generated/` (there is no `.prettierignore`). Check only that the files this change touches are prettier-clean and revert any generated-client churn; do not add a `.prettierignore` here
- [x] 8.7 Run `openspec validate refresh-token-session --strict` and confirm it passes
