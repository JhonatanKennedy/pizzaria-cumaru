## 1. Origin policy module

- [x] 1.1 Confirm no new dependency is needed by importing `CorsOptions` from `@nestjs/common` rather than adding `@types/cors`; verify the build resolves the type and `package.json` is unchanged
- [x] 1.2 Implement `parseCorsOrigins(value: unknown): string[]` in `src/config/cors.ts` — comma split, trim each entry, drop empty entries, refuse a `*` entry; verify `cors.spec.ts` covers each of those four cases
- [x] 1.3 Implement `buildCorsOptions(origins: string[]): CorsOptions` — an origin callback that reflects an allowlisted origin, returns `cb(null, false)` for one off the list without throwing, leaves a request with no `Origin` unaffected, and sets no credentialed access; verify `cors.spec.ts` asserts all four behaviors, per the scenarios in `specs/authorization/origin-policy/spec.md`

## 2. Boot-time validation

- [x] 2.1 Split `env.validation.ts`'s `REQUIRED_IN_PRODUCTION` into a required-always list and a required-in-production list, and add `CORS_ORIGINS` to the required-always list; verify the error message names every missing variable
- [x] 2.2 Extend `env.validation.spec.ts` for `CORS_ORIGINS`: missing in development refuses, missing in production refuses, present in either passes; verify `npm test -w apps/api` is green

## 3. Wiring

- [x] 3.1 Wire `main.ts` to read `CORS_ORIGINS` through `ConfigService` and pass `buildCorsOptions(parseCorsOrigins(...))` to `enableCors`, and log the parsed allowlist at boot; verify by starting the app with and without the variable set and reading the two different outcomes

## 4. Environment contract

- [x] 4.1 Document `CORS_ORIGINS` in `apps/api/.env.example` with the development value and a commented placeholder for the production domain; verify the file's stated contract matches exactly what `env.validation.ts` requires — no variable required in code but undocumented here, and none documented but unread
- [x] 4.2 Add `CORS_ORIGINS=http://localhost:5173` to `apps/api/.env.local` for this checkout (gitignored — not a committed change); verify `npm run dev:api` boots

## 5. Dev server port

- [x] 5.1 Add `server: { port: 5173, strictPort: true }` to `apps/web/vite.config.ts`; verify that with 5173 already occupied `npm run dev:web` fails loudly instead of serving 5174

## 6. End-to-end verification

- [x] 6.1 Add an assertion covering the spec's HTTP-level scenarios — an allowlisted origin is reflected and a foreign origin receives no `Access-Control-Allow-Origin` — by building the app in the e2e harness with the CORS options applied, since `main.ts` is otherwise executed by no test; verify `npm run test:e2e -w apps/api` is green
- [x] 6.2 Verify the no-`Origin` regression path by hand against a running API: a `curl` request with no `Origin` header still succeeds, and an existing authenticated request still succeeds
- [x] 6.3 Verify the wildcard refusal by hand: booting with `CORS_ORIGINS=*` refuses to start and names the reason
- [x] 6.4 Run `npm run lint` and confirm it is clean. **`npm run format` is never clean repo-wide** — it rewrites the committed Prisma client under `src/prisma/generated/` (there is no `.prettierignore`). Check only the files this change touches are prettier-clean and revert any generated-client churn; do not try to make the repo-wide run clean, and do not add a `.prettierignore` here
- [x] 6.5 Run `openspec validate restrict-cors-origins --strict` and confirm it passes
