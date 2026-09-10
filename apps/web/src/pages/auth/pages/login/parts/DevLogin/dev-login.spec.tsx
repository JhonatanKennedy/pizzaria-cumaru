import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DevLogin } from './index';

const { loginAsDevMock } = vi.hoisted(() => ({ loginAsDevMock: vi.fn() }));

vi.mock('../../../../../../pages/auth/use-auth', () => ({
  useAuth: () => ({ loginAsDev: loginAsDevMock }),
}));

function renderDevLogin(): ReturnType<typeof userEvent.setup> {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<DevLogin />} />
        <Route path="/manager" element={<div>Painel do gerente</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('DevLogin', () => {
  it('should offer one button per role', () => {
    renderDevLogin();

    expect(
      screen.getByRole('button', { name: 'Entrar como Gerente' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Entrar como Garçom' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Entrar como Cozinheiro' }),
    ).toBeInTheDocument();
  });

  it('should sign in as the chosen role and redirect to its home', async () => {
    const user = renderDevLogin();

    await user.click(
      screen.getByRole('button', { name: 'Entrar como Gerente' }),
    );

    expect(loginAsDevMock).toHaveBeenCalledWith('Manager');
    expect(await screen.findByText('Painel do gerente')).toBeInTheDocument();
  });
});
