## Why

`main.ts:8` calls `app.enableCors()` with no arguments, so the API reflects `Access-Control-Allow-Origin: *` to every web page — there is no origin allowlist at all. Because `POST /auth/login` is `@Public()`, any site can drive the login endpoint from a visitor's browser and read the response: credential stuffing distributed across visitors' IPs, and a cross-origin trigger for the five-attempt account lockout that takes a named user offline for 15 minutes.

It also blocks the access-token/refresh-token work. `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true` are mutually exclusive, so a refresh cookie cannot be introduced until the origin is pinned to an explicit list.

## What Changes

- **CORS options built from configuration** — a new `CORS_ORIGINS` variable (comma-separated) is the allowlist. A new pure module `src/config/cors.ts` parses it and builds the options; `main.ts` stops calling `enableCors()` bare.
- **Production fails closed** — `CORS_ORIGINS` joins `DATABASE_URL` and `JWT_SECRET` in `env.validation.ts`'s required set, so production refuses to boot without it rather than serving a wrong allowlist.
- **`*` is refused, not honoured** — a wildcard entry is rejected at boot. Honouring it would silently restore the current hole.
- **`.env.example` carries the contract** — the development value, plus a commented placeholder for the production domain to be filled in when it exists.
- **Vite pins port 5173** (`strictPort: true`) — the dev server currently falls back to 5174 silently when 5173 is taken, which would present as an unfixable browser CORS error.
- **Non-browser callers are unaffected** — a request with no `Origin` header (curl, supertest, the seed script, health checks) is neither allowed nor refused by CORS; the disallowed-origin path denies reflection without throwing, so it never becomes a 500.

## Capabilities

### New Capabilities

- `authorization/origin-policy`: which browser origins may call the API, the configuration contract that decides it, and the fail-closed behaviour when it is missing. Sits beside `authorization/permissions`, which answers the same question one layer in — which roles may call it, rather than which origins.

### Modified Capabilities

None. `authorization/permissions` covers authenticated identity and roles; this change adds an earlier, brower-enforced gate and changes no existing requirement.

## Impact

- `src/config/cors.ts` — new: `parseCorsOrigins`, `buildCorsOptions`.
- `src/config/cors.spec.ts` — new: unit spec for the parser and the wildcard refusal.
- `src/config/env.validation.ts` — `CORS_ORIGINS` added to the required set.
- `src/config/env.validation.spec.ts` — extended for the new variable.
- `src/main.ts` — `enableCors()` wired through `ConfigService`.
- `apps/api/.env.example` — new variable documented; production placeholder.
- `apps/web/vite.config.ts` — `server.port` + `strictPort`.
- Observable change: a browser at an origin not on the allowlist can no longer read API responses. Today the only browser origin is the SPA dev server, which is on the list, so no working caller is lost.
- **Not in scope:** TLS, the refresh-token work, and the account-lockout hardening. CORS is enforced by browsers and is not access control — it closes the cross-origin-from-a-victim's-browser vectors only, and a non-browser client ignores it entirely.
