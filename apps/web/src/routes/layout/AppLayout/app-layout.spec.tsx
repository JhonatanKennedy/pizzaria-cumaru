import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppLayout } from './index';

const { userHolder, logoutMock } = vi.hoisted(() => ({
  userHolder: { value: { id: 1, login: 'ana.gerente', role: 'Manager' } },
  logoutMock: vi.fn(),
}));

vi.mock('@pages/auth/use-auth', () => ({
  useAuth: () => ({ user: userHolder.value, logout: logoutMock }),
}));

function renderShell(): void {
  render(
    <MemoryRouter>
      <AppLayout />
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('should carry the manager rail onto the screens outside the manager area', () => {
    userHolder.value = { id: 1, login: 'ana.gerente', role: 'Manager' };
    renderShell();

    // The rail's own destinations include the waiter's and the cook's screens,
    // so a rail scoped to /manager would strand the manager on the way to half
    // of what it offers.
    expect(
      screen.getByRole('navigation', { name: 'Painel do Gerente' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Painel da Cozinha' }),
    ).toHaveAttribute('href', '/kitchen');
  });

  it('should leave the waiter without a rail', () => {
    userHolder.value = { id: 2, login: 'joao.garcom', role: 'Waiter' };
    renderShell();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('joao.garcom')).toBeInTheDocument();
  });

  it('should leave the cook without a rail', () => {
    userHolder.value = { id: 3, login: 'carlos.cozinha', role: 'Cook' };
    renderShell();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
