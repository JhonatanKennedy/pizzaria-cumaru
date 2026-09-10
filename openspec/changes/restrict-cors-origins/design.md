## Context

See proposal.md — Why. The current shape that forces the decisions below:

- `main.ts:8` calls `app.enableCors()` with no arguments. The `cors` middleware defaults `origin` to `*`, and because `credentials` defaults to false the response carries no `Access-Control-Allow-Credentials`. Net effect: every origin is answered, and no origin is admitted with credentials.
- **CORS is configured in `main.ts`, and no test executes `main.ts`.** `main.ts` is not imported by any spec; all seven e2e suites build their application with `moduleFixture.createNestApplication()` (`auth.e2e-spec.ts:21`) and never call `enableCors`, so they run with CORS off entirely. Anything left inline in `main.ts` is, in practice, unverifiable.
- `src/config/` is an established home for boot-time configuration and already pairs a module with its spec: `env.validation.ts` + `env.validation.spec.ts`.
- `env.validation.ts` exports `isProduction` as a separate function, and three files import it (`app.module.ts:11`, `users/users.module.ts:9`, `prisma/seed.ts:5`). It is a shared seam, not a local helper — widening its required-variable list touches more than one reader.
- `ConfigModule.forRoot` reads `.env.local` and sets `ignoreEnvFile` in production (`app.module.ts:20-25`), so production takes its values from real process variables only.
- `.env.local` is gitignored and never travelled with the monorepo merge — a fresh clone has none, and must recreate it for `DATABASE_URL` already.
- `vite.config.ts` has no `server` block, so 5173 is an unenforced default that silently yields to 5174.
- `cookie-parser` is not a dependency and no code sets or reads a cookie.

## Goals / Non-Goals

**Goals:**

- One place decides the allowlist, and that place is testable without booting Nest.
- The production value is a documented placeholder until the domain exists; production refuses to run without it.
- Non-browser callers keep working unchanged.
- The value is one variable, so the dev and production shapes cannot drift.

**Non-Goals:**

- TLS. Recorded here as the prerequisite for the cookie work, not part of this change.
- Refresh tokens, cookies, and `credentials: true`. This change only removes the blocker that made them impossible.
- The account-lockout availability problem (five failed attempts lock a named login for 15 minutes) — a live issue, deliberately separate.
- No `helmet`, no CSP, no rate limiting, no `@nestjs/throttler`.
- No change to `RolesGuard` or any authorization rule. This gate runs earlier and is enforced by the browser, not by the server.

## Decisions

**1. A pure `src/config/cors.ts`, not options inline in `main.ts`.**

Origin parsing is the only part of this change with real logic — split, trim, drop empties, refuse `*` — and decision 7 makes the wildcard check load-bearing. Leaving it in `main.ts` means it is exercised by nothing, per the Context above. `parseCorsOrigins` and `buildCorsOptions` are pure and get a colocated spec (`cors.spec.ts`), matching the `env.validation.ts` + `env.validation.spec.ts` pair already in that folder; `main.ts` becomes a two-line wiring.

*Alternative rejected:* three lines in `main.ts`. Cheaper to write, and untestable in this repo's harness — which is how the current wildcard survived unnoticed.

**2. One comma-separated `CORS_ORIGINS`, not per-mode variables.**

`apps/api/.claude/rules/01-project-context.md` states the principle directly: *"Modes are env-driven, never code-driven."* With one variable the code contains no branch at all and only the value differs between environments; the invariant (never `*`, never with credentials) is stated once.

*Alternative rejected:* `CORS_ORIGINS_DEV` / `CORS_ORIGINS_PROD` selected by a `NODE_ENV` branch. It forces the branch the rulebook forbids, duplicates the invariant across two names, and hides the effective value from the operator reading one variable.

**3. Deny by not reflecting, never by throwing.**

For an origin off the list the callback returns `cb(null, false)`. Throwing instead routes to `next(err)`, where the global `DomainErrorFilter` converts an ordinary, expected browser case into a 500. Not reflecting is the standards behavior: the browser blocks the read, the server is untroubled.

The same callback covers the no-`Origin` case, which must stay a no-op: `curl`, supertest, `seed.ts` and any health check send no `Origin`, and CORS is a browser protocol that has no opinion about them.

*Alternative rejected:* answering a foreign origin with 403. It needs middleware outside the `cors` layer, introduces a status no client handles, and — worse — reads to the next maintainer as though the API had an access boundary, which it does not.

**4. `credentials` stays off. — CONFIRMED**

Nothing needs it: authentication is a bearer header (`http-client.ts:47`) and there are no cookies to send. A flag that currently does nothing is a line every future reader has to reason about.

It flips in `refresh-token-session`, which is now written and sets it in its task 5.1. That change is also the moment the invariant becomes live: `credentials: true` requires an explicit origin list and is incompatible with `*`.

*Alternative considered:* enabling it now "so it is ready". Rejected — it would grant cross-origin credential sending before a cookie credential exists.

**5. Development is required, not defaulted. — CONFIRMED**

`validateEnv` passes development through untouched (`env.validation.ts:20-22`), so adding `CORS_ORIGINS` only to the production list would leave development with an empty allowlist: every SPA request fails, with a browser message that names nothing useful, and a gitignored `.env.local` means every clone hits it. Development therefore refuses to start and names the variable.

Chosen over a `'http://localhost:5173'` code default because a fresh clone must recreate `.env.local` for `DATABASE_URL` anyway, so the requirement adds no new friction — and because the existing `JWT_SECRET` fallback (`'dev-secret-change-me'`) fails loudly in the one place it matters, whereas a wrong CORS default fails every request quietly.

This implies a shape change in `env.validation.ts`: the single `REQUIRED_IN_PRODUCTION` list becomes a required-always list plus a required-in-production list, rather than one production list with a special case bolted on.

*Alternative rejected:* hardcoding the development origin. It works on clone, is invisible until it is wrong, and (per decision 2) puts the value back in code.

**6. Vite pins the port.**

`server: { port: 5173, strictPort: true }`. Without `strictPort`, a busy 5173 makes Vite serve 5174 — and the SPA is then an origin off the list, so the symptom is a CORS failure in the browser console with no hint that the port moved. This machine has a history of port collisions between checkouts. Pinning converts a misleading failure into a correct, loud one.

*Alternative rejected:* listing `http://localhost:5174` as well. It papers over the fallback and the list drifts as more checkouts appear.

**7. The wildcard refusal is a boot-time check, not a comment.**

Someone will eventually reach for `CORS_ORIGINS=*` to make a failure go away. A documented prohibition would not survive that; a startup error naming the reason will. This is the requirement that keeps the change from being undone by one environment edit — hence its own scenario in the spec rather than a footnote in the parser.

## Risks / Trade-offs

- **[CORS is browser-enforced, so this is not access control]** → `curl`, a script, or a server-side caller ignores the allowlist entirely and is unaffected. Only the cross-origin-from-a-visitor's-browser vectors close. Stated in both the proposal and the spec so it is not mistaken for a boundary. → Mitigation is honesty in the artifacts, not code.
- **[The API still has no TLS]** → the allowlist is enforced on a channel a LAN observer can read, and a refresh cookie would travel that channel. → Out of scope by decision; recorded as the prerequisite for the cookie work so the ordering is not lost.
- **[A typo in `CORS_ORIGINS` locks out the SPA]** → the failure is browser-side and names nothing on the server. → `env.validation.ts` fails closed when the variable is missing, and boot logs the parsed allowlist so the operator sees what was actually accepted.
- **[Development origins multiply]** → a second checkout on 5174, or a LAN address when testing delivery orders from a phone. → The value is comma-separated from the start, so this needs no code change; only an environment edit.
- **[The wildcard refusal could block a legitimate future case]** → a genuinely public, uncredentialed endpoint would want `*`. → None exists today. If one appears it should be its own decision that re-examines the credentials invariant, not a quiet wildcard.
- **[Widening `env.validation.ts` reaches three importers]** → `app.module.ts`, `users/users.module.ts` and `prisma/seed.ts` all import `isProduction`. → The new required list is additive; `isProduction`'s behavior is unchanged, so the three importers are unaffected.

## Migration Plan

No deployment exists, so there is nothing to migrate.

- Development: add `CORS_ORIGINS=http://localhost:5173` to `apps/api/.env.local` (gitignored — each checkout needs its own).
- Production: set the real origin when the domain exists. Until then production refuses to start, which is the intended fail-closed behavior, not a regression.
- Rollback: revert the commit. Note that setting `CORS_ORIGINS=*` is deliberately *not* a rollback path — it is refused at boot by decision 7.

## Open Questions

- **The production origin itself.** `.env.example` carries a commented placeholder; the real value is an operator concern and changes no requirement, approach or task here.
- **Where the production value is set.** The repo holds no deployment configuration (no proxy, no container orchestration), so there is no file to name yet.
