import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { TablesPage } from './tables';

const { tablesMock, createOrderMock, roleHolder } = vi.hoisted(() => ({
  tablesMock: vi.fn(),
  createOrderMock: vi.fn(),
  roleHolder: { value: 'Waiter' },
}));

vi.mock('../hooks/use-tables', () => ({
  useTables: () => tablesMock(),
}));

vi.mock('../hooks/use-create-table-order', () => ({
  useCreateTableOrder: () => ({ mutateAsync: createOrderMock }),
}));

vi.mock('@pages/auth/use-auth', () => ({
  useAuth: () => ({
    user: { id: 2, login: 'joao.garcom', role: roleHolder.value },
  }),
}));

const TABLES: TTableListingEntry[] = [
  { id: 'table-1', number: 1, openOrder: null },
];

function renderPage(role = 'Waiter'): void {
  roleHolder.value = role;
  tablesMock.mockReturnValue({
    data: TABLES,
    isPending: false,
    error: null,
  });
  render(
    <MemoryRouter>
      <TablesPage />
    </MemoryRouter>,
  );
}

describe('TablesPage', () => {
  beforeEach(() => {
    createOrderMock.mockReset();
  });

  it('should not offer the waiter a way back, since this is their only screen', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Pedidos de mesa' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should offer the manager a way back to the hub', () => {
    renderPage('Manager');

    expect(
      screen.getByRole('link', { name: 'Voltar para Painel do gerente' }),
    ).toHaveAttribute('href', '/manager');
  });

  it('should keep the way back while the floor is still loading', () => {
    roleHolder.value = 'Manager';
    tablesMock.mockReturnValue({
      data: undefined,
      isPending: true,
      error: null,
    });
    render(
      <MemoryRouter>
        <TablesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: 'Voltar para Painel do gerente' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
  });

  it('should not open a table twice while the first attempt is in flight', async () => {
    // A promise that never settles: the second tap lands inside the window the
    // guard exists for, which is also when the backend would refuse it.
    createOrderMock.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Abrir mesa' }));

    expect(screen.getByRole('button', { name: 'Abrindo…' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Abrindo…' }));

    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });
});
