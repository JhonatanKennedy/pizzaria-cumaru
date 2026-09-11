import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth.context';
import { RequireRole } from './require-role';
import { useAuth } from './use-auth';
import {
  readStoredUser,
  writeStoredUser,
  type StoredUser,
} from './business/auth-storage';
import { handleSessionEnded } from './business/handle-unauthorized';

const { refreshAccessTokenMock, revokeTokenMock } = vi.hoisted(() => ({
  refreshAccessTokenMock: vi.fn(),
  revokeTokenMock: vi.fn(),
}));

vi.mock('./business/session', () => ({
  readAccessToken: () => null,
  writeAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
  refreshAccessToken: refreshAccessTokenMock,
}));

vi.mock('./api/auth.api', () => ({
  authenticate: vi.fn(),
  revokeToken: revokeTokenMock,
}));

const WAITER: StoredUser = { id: 1, login: 'joao.garcom', role: 'Waiter' };
const REFRESHED_TOKEN = 'the-refreshed-token';
const LOGIN_SCREEN = 'Tela de login';
const WAITER_PANEL = 'Painel do Garçom';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function SignOutButton(): React.ReactNode {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={() => void logout()}>
      Sair
    </button>
  );
}

// A reload is exactly this: storage as the browser left it, then a fresh mount.
function renderApp(): void {
  render(
    <MemoryRouter initialEntries={['/waiter']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>{LOGIN_SCREEN}</div>} />
          <Route
            path="/waiter"
            element={
              <RequireRole roles={['Waiter']}>
                <div>{WAITER_PANEL}</div>
                <SignOutButton />
              </RequireRole>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  refreshAccessTokenMock.mockReset();
  revokeTokenMock.mockReset();
  refreshAccessTokenMock.mockResolvedValue(REFRESHED_TOKEN);
  revokeTokenMock.mockResolvedValue(undefined);
});

describe('AuthProvider boot', () => {
  it('should hold the first render until the refresh answers', async () => {
    writeStoredUser(WAITER);
    const refresh = deferred<string | null>();
    refreshAccessTokenMock.mockReturnValue(refresh.promise);

    renderApp();

    // The signed-in page is asked for with no token in hand, so a `null` user
    // here would be indistinguishable from a signed-out one — and the guard
    // would send the waiter to the login screen for that one frame.
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByText(LOGIN_SCREEN)).not.toBeInTheDocument();
    expect(screen.queryByText(WAITER_PANEL)).not.toBeInTheDocument();

    await act(async () => {
      refresh.resolve(REFRESHED_TOKEN);
    });

    expect(await screen.findByText(WAITER_PANEL)).toBeInTheDocument();
    expect(screen.queryByText(LOGIN_SCREEN)).not.toBeInTheDocument();
  });

  it('should keep the session when the refresh succeeds', async () => {
    writeStoredUser(WAITER);

    renderApp();

    expect(await screen.findByText(WAITER_PANEL)).toBeInTheDocument();
    expect(refreshAccessTokenMock).toHaveBeenCalledTimes(1);
  });

  it('should end the session when the refresh is refused', async () => {
    writeStoredUser(WAITER);
    refreshAccessTokenMock.mockResolvedValue(null);

    renderApp();

    expect(await screen.findByText(LOGIN_SCREEN)).toBeInTheDocument();
    expect(readStoredUser()).toBeNull();
  });

  it('should not refresh when nothing was stored', async () => {
    renderApp();

    // No stored user means no session to continue, so there is nothing to ask
    // the cookie about — and the login screen is the right first render.
    expect(await screen.findByText(LOGIN_SCREEN)).toBeInTheDocument();
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
  });
});

describe('AuthProvider session end', () => {
  it('should sign the user out when a refresh has already failed elsewhere', async () => {
    writeStoredUser(WAITER);

    renderApp();
    await screen.findByText(WAITER_PANEL);

    act(() => {
      handleSessionEnded();
    });

    expect(await screen.findByText(LOGIN_SCREEN)).toBeInTheDocument();
    expect(readStoredUser()).toBeNull();
  });

  it('should sign the user out even when the backend call fails', async () => {
    writeStoredUser(WAITER);
    revokeTokenMock.mockRejectedValue(new Error('Session expired'));

    renderApp();
    await screen.findByText(WAITER_PANEL);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Sair' }));

    expect(await screen.findByText(LOGIN_SCREEN)).toBeInTheDocument();
    expect(readStoredUser()).toBeNull();
  });
});
