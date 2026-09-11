# Testing rules

Tests follow the **test pyramid** and the **F.I.R.S. principles** (Timely deliberately excluded). Both are enforced in review.

## The test pyramid

More unit tests than integration tests, more integration tests than e2e tests. Target split:

| Layer                                              | Where it lives      | Run with   | Share of test code |
| -------------------------------------------------- | ------------------- | ---------- | ------------------ |
| Unit — pure functions, zod schemas, role mapping   | colocated `*.spec.ts` | `npm test` | ~70%              |
| Integration — components with Testing Library      | colocated `*.spec.tsx` | `npm test` | ~20%             |
| E2E — full user journeys through the SPA           | `cypress/e2e/*.cy.ts` | `npm run test:e2e` (repo root) | ~10% |

Rule of thumb: **every business rule gets a unit test; e2e covers only complete user journeys**, not edge cases. A role guard rejecting a cook from `/reports/daily-earnings` is a unit test on `roleHomePath`/`isUserRole` and a component test on the guard — not a full-browser assertion.

```ts
// ❌ business rule tested through the whole stack: slow, needs the backend
it('should not show the report to a cook', () => {
  cy.visit('/reports/daily-earnings'); // Cypress against the whole stack
  cy.contains('Access not authorized').should('be.visible');
});

// ✅ the same rule as a unit test on the pure mapping — milliseconds, no I/O
it('should map each role to its home screen', () => {
  expect(roleHomePath('Manager')).toBe('/manager');
  expect(roleHomePath('Cook')).toBe('/kitchen');
});
```

## F.I.R.S. — four of the five

F.I.R.S.T stands for Fast, Independent, Repeatable, Self-validating, Timely. We follow the first four. **Timely is intentionally dropped**: tests do not have to be written before the code (no TDD requirement) — they may come with or right after the implementation, as long as business rules end up covered.

### Fast

Unit tests must run in milliseconds — no backend, no network. A test that fetches from a real API is not a unit test.

```ts
// ❌ hits the real backend — not a unit test
it('should authenticate', async () => {
  const response = await fetch('http://localhost:3000/auth/login', { ... });
  expect(response.ok).toBe(true);
});

// ✅ pure schema logic — no I/O at all
it('should trim the login', () => {
  const result = loginFormSchema.safeParse({ login: '  joao.garcom  ', password: 'x' });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.login).toBe('joao.garcom');
  }
});
```

Component tests use Testing Library with jsdom; they mock module boundaries (the auth hook, the API layer) — never a real fetch.

### Independent

Each test builds its own fixtures and shares nothing. Tests must pass in any order, in any subset, alone (`it.only`).

```tsx
// ❌ module-level mock state mutated across tests — order-dependent
const user = userEvent.setup();

describe('LoginForm', () => {
  it('shows an error', async () => { ... });
  it('navigates on success', async () => {
    await user.type(...); // depends on the previous test's events
  });
});

// ✅ fresh setup per test (helper called in each it)
function renderLoginForm(): ReturnType<typeof userEvent.setup> {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}
```

### Repeatable

Same result on every run: no real clock, no randomness, no shared external state. Where a rule involves time, inject the clock instead of reading it.

```ts
const MS_PER_HOUR = 60 * 60 * 1000;

// ❌ reads the real clock — the outcome changes by the hour
const expiresAt = new Date(Date.now() + MS_PER_HOUR);

// ✅ clock passed in — the test always asserts the same result
function getExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + MS_PER_HOUR);
}
```

### Self-validating

Assertions decide pass/fail — never `console.log` for a human to verify.

```tsx
// ❌ requires a human to read the output
it('renders the login form', () => {
  render(<LoginForm />);
  console.log(document.body.innerHTML); // "looks right" is not a test
});

// ✅ asserts the observable outcome
it('should show validation errors when submitted empty', async () => {
  const user = renderLoginForm();
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Usuário é obrigatório')).toBeInTheDocument();
});
```

### Timely — intentionally not required

The "T" is dropped from our F.I.R.S. on purpose: writing the test first (TDD) is allowed but not mandated. What is mandated: when a feature ships, its business rules have tests.

## Layout & tooling

- Unit and component tests: colocated `*.spec.ts` / `*.spec.tsx` next to the code under test. E2E: `cypress/e2e/*.cy.ts`, run with `npm run test:e2e` **from the repo root**.
- Vitest `globals: true` — never import `describe`, `it`, `expect`, `vi`.
- Mock at module boundaries with `vi.mock` + `vi.hoisted` for the mocked function (see the LoginForm spec below); component tests render with `MemoryRouter` and Testing Library queries (`getByRole`, `getByLabelText`, `findByText`).
- E2E specs map to feature files, as in the backend. If you can't name the scenario it covers, the test doesn't belong in e2e. The current map:

| Spec                      | Feature files                                            |
| ------------------------- | -------------------------------------------------------- |
| `auth.cy.ts`              | `01_authentication`                                      |
| `waiter-table-order.cy.ts`| `03_table_order`, `05_waiter_profile`, `09_cancellation_and_payment` |
| `kitchen-panel.cy.ts`     | `06_cook_profile`                                        |
| `manager-close-order.cy.ts` | `07_manager_profile`, `09_cancellation_and_payment`    |
| `manager-menu-stock.cy.ts`| `02_menu_and_stock`                                      |
| `manager-tables.cy.ts`    | `10_table_management`                                    |
| `manager-delivery.cy.ts`  | `04_delivery_order`                                      |
| `manager-reports.cy.ts`   | `07_manager_profile`                                     |

### E2E: the stack is part of the command

`npm run test:e2e` (root) runs `scripts/run-e2e.mjs`, which is the **whole story** — Cypress has no `webServer` equivalent, so the script starts what the suite needs and tears down only what it started (Postgres is left up). It reuses an already-running Postgres on the port `TEST_DATABASE_URL` names, starts one only if nothing answers, then resets and seeds the **test** database, serves the API and the SPA on a private `3100`/`5174` pair, and finally runs Cypress. Consequence: **the suite works whether or not `npm run dev:api` / `npm run dev:web` are up, and it never touches the developer's database.** It fail-closes if `TEST_DATABASE_URL` does not name a `_test` database, because the reset step is destructive. Any further argument reaches Cypress untouched, so `npm run test:e2e -- --spec cypress/e2e/auth.cy.ts` runs one spec while still bringing the stack up the same way.

**Never run this on the production host.** The `_test` check is the only thing standing between `prisma migrate reset` and whatever database `TEST_DATABASE_URL` names, and it is a *name* check — a production database called `something_test` would pass it. Two further reasons, independent of that check: the runner's fallback when nothing answers on the Postgres port is `docker compose up -d --wait` in `apps/api`, whose compose file hardcodes `POSTGRES_DB: pizzaria_cumaru` and the `pgdata` volume, so it can start the production container; and the API it boots calls `app.listen(port)` with no host, so it binds every interface — on a public IP that is the seeded logins in this repo, served under `NODE_ENV=development`, reachable from outside. It belongs on an ephemeral machine with its own Postgres, which is what CI gives it.

Two things that bite when writing specs:

- **Never fake a session by writing `localStorage`.** Only the user blob is stored; a boot with no refresh cookie is not a session, and the app will correctly throw it away. `cy.loginAs(login)` drives the real form and is the only way in.
- **`cy.session()` is not usable here, and will look like it works.** It snapshots cookies once and replays them, but the refresh token is rotated single-use, so the first restore succeeds and every later one replays a spent token — a 401 that logs the test straight back out. `loginAs` deliberately does a fresh form login per test instead; that is also what keeps the tests independent.

## Naming

`describe('<Component | function>')` → `it('should <observable behavior>')` — English, present tense, behavior not implementation:

```ts
describe('loginFormSchema', () => {
  it('should accept a login and password', () => { ... });
  it('should reject an empty login and password', () => { ... });
});

describe('LoginForm', () => {
  it('should show validation errors when submitted empty', () => { ... });
  it('should redirect to the role home screen on success', () => { ... });
});
```

## Full example — component spec for the login form

`src/pages/auth/pages/login/parts/LoginForm/login-form.spec.tsx` — mocks the `useAuth` hook at the module boundary and asserts against the rendered output:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiError } from '@api/http-client';
import { LoginForm } from './index';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('@pages/auth/use-auth', () => ({
  useAuth: () => ({ login: loginMock }),
}));

function renderLoginForm(): ReturnType<typeof userEvent.setup> {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/waiter" element={<div>Painel do garçom</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('LoginForm', () => {
  it('should display the backend error message when login fails', async () => {
    loginMock.mockRejectedValue(new ApiError(400, 'Invalid username or password'));
    const user = renderLoginForm();

    await user.type(screen.getByLabelText('Login'), 'joao.garcom');
    await user.type(screen.getByLabelText('Password'), 'senhaErrada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });
});
```

The success case is the same harness with `loginMock.mockResolvedValue(...)` and a `findByText('Painel do garçom')` — the redirect is asserted against the sibling route, not by spying on `navigate`. Pure-function specs (`role.spec.ts`) need no fixtures and are not worth an example here.
