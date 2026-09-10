import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiError } from '@api/http-client';
import { LoginForm } from './index';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('../../../../../../pages/auth/use-auth', () => ({
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
  it('should show validation errors when submitted empty', async () => {
    const user = renderLoginForm();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Usuário é obrigatório'),
    ).toBeInTheDocument();
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('should redirect to the role home screen on success', async () => {
    loginMock.mockResolvedValue({
      id: 1,
      login: 'joao.garcom',
      role: 'Waiter',
    });
    const user = renderLoginForm();

    await user.type(screen.getByLabelText('Usuário'), 'joao.garcom');
    await user.type(screen.getByLabelText('Senha'), 'SenhaSegura123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Painel do garçom')).toBeInTheDocument();
    expect(loginMock).toHaveBeenCalledWith('joao.garcom', 'SenhaSegura123');
  });

  it('should display the backend error message when login fails', async () => {
    loginMock.mockRejectedValue(
      new ApiError(400, 'Invalid username or password'),
    );
    const user = renderLoginForm();

    await user.type(screen.getByLabelText('Usuário'), 'joao.garcom');
    await user.type(screen.getByLabelText('Senha'), 'senhaErrada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByText('Invalid username or password'),
    ).toBeInTheDocument();
  });
});
