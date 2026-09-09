import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { MANAGER_ROLES } from '@pages/auth/business/role';
import { RequireRole } from '@pages/auth/require-role';
import { TablesPage } from './tables-page';

const { useAuthMock, tablesMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  tablesMock: vi.fn(),
}));

vi.mock('@pages/auth/use-auth', () => ({
  useAuth: () => ({ user: useAuthMock() }),
}));

vi.mock('../../hooks/use-tables', () => ({
  useTables: () => tablesMock(),
}));

const TABLES: TTableListingEntry[] = [
  { id: 'table-3', number: 3, openOrder: null },
];

function renderRoute(userRole: 'Manager' | 'Waiter' = 'Manager'): void {
  useAuthMock.mockReset();
  useAuthMock.mockReturnValue({ role: userRole });
  tablesMock.mockReset();
  tablesMock.mockReturnValue({
    data: TABLES,
    isPending: false,
    error: null,
  });
  render(
    <MemoryRouter initialEntries={['/manager/tables']}>
      <Routes>
        <Route
          path="/manager/tables"
          element={
            <RequireRole roles={MANAGER_ROLES}>
              <TablesPage />
            </RequireRole>
          }
        />
        <Route path="/waiter" element={<div>Painel do Garçom</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('tables route guard', () => {
  it('should render the tables screen for a Manager', () => {
    renderRoute();

    expect(screen.getByRole('heading', { name: 'Mesas' })).toBeInTheDocument();
    expect(screen.getByText('Mesa 3')).toBeInTheDocument();
  });

  it('should deny a Waiter with the access-denied screen', () => {
    renderRoute('Waiter');

    expect(
      screen.getByText('Acesso não autorizado para o seu perfil'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voltar ao meu painel' }),
    ).toHaveAttribute('href', '/waiter');
    expect(
      screen.queryByRole('heading', { name: 'Mesas' }),
    ).not.toBeInTheDocument();
  });
});
