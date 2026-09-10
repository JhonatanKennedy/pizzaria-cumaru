## Context

See proposal.md — Why. The current shape that forces the decisions below:

- `RolesGuard` is the single global auth gate (`APP_GUARD` in `app.module.ts`) and verifies the bearer token with one injected `JwtService`, whose secret comes from `JWT_SECRET` (`users.module.ts:13-20`). Its check is signature + `sub`/`role` + `jti` denylist (`roles.guard.ts:80-87`) — **the token's lifetime is nowhere in the accept path**, so any token that verifies is an access token, for as long as it lasts.
- `JWT_SECRET` falls back to `'dev-secret-change-me'` when unset (`users.module.ts:20`), which is the state of every fresh clone: `.env.local` is gitignored.
- `DeniedToken` is `{ jti, expiresAt }`, written by `denyToken` (an upsert) and read by `isTokenDenied`, which queries `jti` alone and **never reads `expiresAt`**. Entries are permanent today. There is no cleanup job.
- Logout is a guarded route that reads the bearer header (`auth.controller.ts:29-35`), so logging out requires a live access token.
- The SPA answers "is there a session?" synchronously from `localStorage` (`auth-storage.ts:29-31`), and `routes/app.tsx:10` configures the api client before the router renders. `onUnauthorized` clears the session.
- `restrict-cors-origins` is written but unimplemented. It creates `src/config/cors.ts` and `CORS_ORIGINS`, and deliberately leaves `credentials` off — its decision 4 records that the flag flips here.
- No dependency reads a `Cookie` header. No TLS, and no deployment configuration of any kind exists in the repo.
- Seven e2e suites build the app with `createNestApplication()` and authenticate with `Authorization: Bearer`; `auth.e2e-spec.ts` asserts `response.body.token`.

## Goals / Non-Goals

**Goals:**

- Two token kinds that cannot be substituted for one another, enforced so that a mistake fails closed rather than silently granting access.
- The long-lived credential is unreadable by page scripts and is not attached to the endpoints that do not need it.
- A refresh token is usable at most once.
- Logging out ends the session even when the access token is already dead.
- No schema change, no migration, no regenerated Prisma client.

**Non-Goals:**

- Reuse detection and family revocation — a replayed token is refused, but it does not end the session. This is what keeps the change schema-free; see decision 2.
- TLS. Named as a prerequisite for `Secure` to mean anything in production, not delivered here.
- A CSRF token. Decision 3 is what makes one unnecessary in the intended deployment.
- Sessions for non-browser callers, multi-device session listing, or "sign out everywhere". There is no session table to list, and adding one is the reuse-detection work.
- The account-lockout availability problem, still deliberately separate.

## Decisions

**1. Two independent mechanisms separate the token kinds: a distinct secret and a `typ` claim.**

Because the guard's accept path never looks at lifetime, a refresh token signed with the access secret would verify, carry `sub`/`role`/`jti`, and pass every check — the long-lived token would *be* a valid access token, and the short TTL would be defeated by simply sending the cookie's value as a bearer. Two mechanisms are used because they fail differently:

- **`JWT_REFRESH_SECRET`** — a refresh token presented as a bearer token fails *signature verification* against the access secret. This fails closed by construction, with no rule to remember.
- **`typ: 'access' | 'refresh'`** — the guard requires `typ === 'access'`. This catches the case a signature check structurally cannot: both secrets configured to the same value, where the signature would legitimately pass.

*The dev-fallback trap, and why `env.validation.ts` refuses to boot when the secrets are equal:* `JWT_SECRET`'s fallback is `'dev-secret-change-me'`. If `JWT_REFRESH_SECRET` fell back to that same literal, the two secrets would collide in precisely the environment that has none set — a fresh clone — and mechanism one would silently disappear while everything still appeared to work. The refresh fallback is therefore a **different** literal, and a boot check refuses to start when the two values are equal, so the invariant is enforced rather than trusted.

*Alternative rejected:* require `JWT_REFRESH_SECRET` always, with no fallback. It reads as stricter but breaks `npm test` on a fresh clone while development already tolerates a known `JWT_SECRET` — the same policy applied inconsistently.

**2. Rotation on refresh with plain refusal on replay — no reuse detection.**

`denyToken` is already an upsert into `DeniedToken` and `isTokenDenied` is one lookup on the primary key, so rotation costs one row per refresh and no schema change: refresh issues a new `jti`, denylists the old one, and a replayed token hits the denylist and gets a 401.

Reuse detection would *distinguish* a replaced token from a revoked one so that a replay can revoke the whole family — and `DeniedToken` cannot express that difference. It needs a session id or a parent-`jti` column, i.e. a migration. Deferred on the grounds that a thief who can read the wire can also read the login response, so with no TLS the alarm is largely theoretical.

The accepted consequence, stated so it is not discovered later: **a stolen refresh token stays usable until its next rotation or logout.**

`expiresAt` is already written on every denied row although nothing reads it — that column is the hook a future cleanup or family check would use, which is part of why no schema change is needed now.

**3. The cookie is `HttpOnly`, scoped `Path=/auth`, `SameSite=Lax`, `Secure` in production.**

- **`Path=/auth`** is the load-bearing one. The refresh cookie is meaningful only to `/auth/login`, `/auth/refresh` and `/auth/logout`, so scoping it there means the browser never attaches it to `/orders`, `/items`, `/reports` or the kitchen routes. There is no ambient credential on the API surface at all, which is why this change needs no CSRF token: there is nothing to forge a cross-site request *with*.
- **`SameSite=Lax`** covers the endpoints the `Path` does expose. Lax withholds the cookie on cross-site POST, which is exactly how `/auth/refresh` and `/auth/logout` are called.
- **`HttpOnly`** — page scripts cannot read the value. Note what this does and does not buy: a live XSS can still *call* `/auth/refresh`, receive an access token it can read, and act as the user for the life of the page. What it cannot do is copy out a credential that outlives the tab. The 15-minute TTL is what bounds the first; `HttpOnly` is what removes the second.
- **`Secure` in production** — and this is where TLS becomes load-bearing, since a browser drops a `Secure` cookie sent over plain HTTP.

*Deployment constraint this decision depends on:* `SameSite=Lax` sends the cookie because the SPA and API are same-site, and in development they are (`localhost:5173` → `localhost:3000` — port is not part of "site"). It stays true only while production puts both on the same registrable domain. If they ever diverge, the cookie stops being sent on POST and refresh breaks outright; the escalation is `SameSite=None; Secure` **plus** the CSRF token this decision was avoiding, and it deserves its own decision rather than a quiet flag flip.

*Alternative rejected:* `SameSite=None` from the start "to keep deployment free". It buys deployment latitude by giving up the cross-site POST protection, in exchange for a freedom nothing currently needs.

**4. Logout verifies the refresh cookie instead of the bearer token, and is therefore `@Public()`.**

Today logout is guarded, so it needs a live access token. Shorten the access token to 15 minutes and the user most likely to log out — the one who has been idle — gets a 401, and the refresh cookie is never cleared. The browser would keep a live refresh token after the user believed they had signed out, which contradicts the guarantee `users/authentication` states.

Reading the cookie instead makes "logout ends the session" independent of the access token's lifetime. The authority this hands to a caller is the authority the cookie already carries, and `Path` + `SameSite=Lax` keep another origin from triggering it. Logout is made idempotent — a missing or unverifiable cookie still clears the cookie and succeeds — so a client holding a dead cookie can always get rid of it.

*Alternative rejected:* keep logout guarded and have the client refresh first, then log out. It makes logging out depend on the network round-trip that may itself be the thing that is broken.

**5. Access token 15 minutes, refresh token 12 hours, as named constants.**

The access TTL is the damage window for a token a live XSS can read; 15 minutes cuts it from an hour while keeping rotation to roughly four rows per hour per active user. The refresh TTL is an *idle* timeout rather than a shift length, because rotation mints a fresh token with a fresh TTL on every refresh: an active user's session extends indefinitely, and only genuine inactivity ends it. Twelve hours covers the longest plausible idle gap inside a shift.

Both live as named constants rather than environment variables. `01-project-context.md`'s "modes are env-driven, never code-driven" is about not branching on `NODE_ENV`, and these are not mode-dependent — development and production want the same session length, so a variable would add a knob with one correct setting.

**6. The SPA keeps the access token in memory, refreshes at boot, and retries once on a 401.**

In memory is not a claim that XSS cannot read it — a module-level variable is as readable as `localStorage` to script running right now. The difference is that **nothing survives the tab**, so there is no credential to be picked up later, and the 15-minute TTL bounds the live case. That is the whole of the improvement, and it is enough to be worth the restructuring.

Two consequences in the client that are easy to underestimate:

- **Boot becomes asynchronous.** `readStoredSession` answers synchronously today, and `configureApiClient` runs before the router renders. With the token in memory a reload has no answer until `/auth/refresh` returns, so the boot path must refresh and then render, with a pending state. The stored user blob (`id`, `login`, `role`) can stay in `localStorage` — it is not a credential and routing already reads it — but a blob without a successful refresh must not be treated as a session.
- **The 401 path must be single-flight.** `onUnauthorized` clears the session today. It becomes *refresh once, retry the request, clear only if refresh fails* — and because rotation refuses the token it replaced, a screen firing five requests at once would fire five refreshes, four of which fail and would wrongly end the session. One in-flight refresh that the other callers await is what prevents that, and it needs a test that fires concurrent requests rather than a comment.

*Alternative rejected:* keep the access token in `sessionStorage` or a JS-readable cookie so boot stays synchronous. Both put a persistent, copyable credential back within script reach, which is the thing this change exists to remove.

**7. `credentials: 'include'` on the session calls only.**

`/auth/login`, `/auth/refresh` and `/auth/logout` need it — cross-origin fetch defaults to `same-origin`, under which a `Set-Cookie` on the response is ignored, so without it login cannot establish the cookie at all. The rest of the client is unchanged and keeps sending the bearer header: `Path=/auth` means the browser would not attach the refresh cookie to those routes anyway, so requesting credentials there would widen the credentialed surface for nothing.

**8. The login response field is renamed `token` → `accessToken`.**

With two tokens in play `token` no longer names anything in particular, and the failure mode of leaving it is a client that keeps working while being handed the wrong thing. The rename is mechanical and belongs in the same commit as the response change so no intermediate state exists. It is marked **BREAKING** in the proposal because seven e2e suites and the SPA read the field by name.

**9. `cookie-parser` is added as a dependency.**

Nothing in the API reads a `Cookie` header today. Hand-parsing it in the controller is the alternative, and it means owning the edge cases — multiple cookies, quoted values, malformed input — and testing them, to save one dependency that the Nest ecosystem already expects.

## Risks / Trade-offs

- **[A stolen refresh token is usable until the next rotation or logout]** → The accepted consequence of skipping reuse detection (decision 2). The real mitigation is TLS, which is a named prerequisite; reuse detection is the recorded upgrade path, and `DeniedToken.expiresAt` is the hook it would use.
- **[Production without TLS silently never persists a session]** → `Secure` is set in production, and a browser drops a `Secure` cookie over plain HTTP: login appears to succeed and the session vanishes on the next request, with nothing on the server to say why. → Named in the proposal and here. Booting must log whether `Secure` is on, so the operator sees the state rather than inferring it.
- **[The two secrets could be configured equal, leaving only the `typ` claim]** → `env.validation.ts` refuses to boot when they are equal (decision 1), so the second mechanism is a backstop rather than the only line.
- **[The denylist grows without bound]** → Rotation writes one row per refresh (~4/hour per active user) and `isTokenDenied` ignores `expiresAt`, so nothing is ever pruned; the existing logout path already had no cleanup, this only raises the rate. → Negligible for three users, and `expiresAt` is already populated for a future cleanup. Recorded rather than solved, since pruning is orthogonal to the session shape.
- **[Concurrent 401s would each rotate, and the losers would end the session]** → The highest-risk part of the client work, and a real user-visible bug: rotation refuses the replaced token, so parallel refreshes fail. → A single-flight refresh in the api client (decision 6), covered by a concurrency test.
- **[BREAKING] `token` → `accessToken` breaks the SPA and all seven e2e suites at once** → Deliberate, and mechanical. → One rename, in the same commit as the response change.
- **[The whole change is inert until `restrict-cors-origins` lands]** → `credentials: true` is illegal against `Access-Control-Allow-Origin: *`, so cross-origin login cannot set its cookie. → Ordered explicitly in the migration plan; this is the dependency the CORS design recorded in advance.
- **[Cookie behaviour depends on deployment hostnames]** → Same-site in development, and only same-site in production if the hostnames stay on one registrable domain (decision 3). → Recorded as a constraint with a named escalation, not a flag to flip quietly.

## Migration Plan

No deployment exists, so there is nothing to migrate beyond configuration.

1. Apply `restrict-cors-origins` first. It creates `src/config/cors.ts` and `CORS_ORIGINS`; this change then sets `credentials: true` inside the options it builds. Applied in the other order, login cannot set its cookie cross-origin.
2. Add `JWT_REFRESH_SECRET` to `.env.local` (gitignored — each checkout needs its own) and to `.env.example`, with a value that differs from `JWT_SECRET`.
3. Database: nothing. No schema change, no migration, no regenerated Prisma client.
4. Deploy TLS before production serves this. Until then production refuses to boot without `JWT_REFRESH_SECRET`, and a `Secure` cookie would be dropped anyway.
5. Rollback: revert the commit and clear the `refresh_token` cookie. `restrict-cors-origins` may stay applied — an allowlisted origin list with `credentials: true` and no cookie is harmless, and reverting it is a separate decision with its own reasoning.

## Open Questions

- **The production hostnames** — the same unknown `restrict-cors-origins` already carries. Decision 3 requires only that the SPA and API share a registrable domain; which domain that is changes no requirement, decision or task here.
- **Whether the denylist ever needs pruning** — deferrable: it changes no behavior at this scale, and `DeniedToken.expiresAt` already holds what a cleanup would need.
