# Testing rules

Tests follow the **test pyramid** and the **F.I.R.S. principles** (Timely deliberately excluded). Both are enforced in review.

## The test pyramid

More unit tests than integration tests, more integration tests than e2e tests. Target split:

| Layer                                              | Where it lives      | Run with   | Share of test code |
| -------------------------------------------------- | ------------------- | ---------- | ------------------ |
| Unit — pure functions, zod schemas, role mapping   | colocated `*.spec.ts` | `npm test` | ~70%              |
| Integration — components with Testing Library      | colocated `*.spec.tsx` | `npm test` | ~20%             |
| E2E — full user journeys through the SPA           | *(not set up yet)*  | —          | ~10%               |

Rule of thumb: **every business rule gets a unit test; e2e covers only complete user journeys**, not edge cases. A role guard rejecting a cook from `/reports/daily-earnings` is a unit test on `roleHomePath`/`isUserRole` and a component test on the guard — not a full-browser assertion.

```ts
// ❌ business rule tested through the whole stack: slow, needs the backend
it('should not show the report to a cook', async () => {
  await page.goto('/reports/daily-earnings'); // Playwright against a running app
  expect(await page.textContent('body')).toContain('Access not authorized');
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

- Unit and component tests: colocated `*.spec.ts` / `*.spec.tsx` next to the code under test. E2E: `test/*.e2e-spec.ts` when it exists (Playwright — to be set up, see [08-conventions.md](08-conventions.md)).
- Vitest `globals: true` — never import `describe`, `it`, `expect`, `vi`.
- Mock at module boundaries with `vi.mock` + `vi.hoisted` for the mocked function (see the LoginForm spec below); component tests render with `MemoryRouter` and Testing Library queries (`getByRole`, `getByLabelText`, `findByText`).
- E2E specs map to feature files, as in the backend. If you can't name the scenario it covers, the test doesn't belong in e2e.

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
