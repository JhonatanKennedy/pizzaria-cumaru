import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { TablesPage } from './tables';

const { listTablesMock, createOrderMock, roleHolder } = vi.hoisted(() => ({
  listTablesMock: vi.fn(),
  createOrderMock: vi.fn(),
  roleHolder: { value: 'Waiter' },
}));

// The API modules are the mock seam: the real hooks and QueryClient run over
// them, so a mutation's invalidation is observable as the floor reloading.
vi.mock('@api/tables.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@api/tables.api')>();
  return { ...actual, listTables: listTablesMock };
});

vi.mock('../api/orders.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/orders.api')>();
  return { ...actual, createTableOrder: createOrderMock };
});

vi.mock('@pages/auth/use-auth', () => ({
  useAuth: () => ({
    user: { id: 2, login: 'joao.garcom', role: roleHolder.value },
  }),
}));

const FREE_TABLE: TTableListingEntry = {
  id: 'table-1',
  number: 1,
  openOrder: null,
};

const OPEN_TABLE: TTableListingEntry = {
  id: 'table-1',
  number: 1,
  openOrder: { orderId: 'order-9', totalPrice: 42.5 },
};

function renderPage(
  firstListing: TTableListingEntry[],
  nextListing?: TTableListingEntry[],
  role = 'Waiter',
): ReturnType<typeof userEvent.setup> {
  roleHolder.value = role;
  listTablesMock
    .mockReset()
    .mockResolvedValueOnce(firstListing)
    .mockResolvedValue(nextListing ?? firstListing);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TablesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe('TablesPage', () => {
  beforeEach(() => {
    createOrderMock.mockReset();
  });

  it('should not offer the waiter a way back, since this is their only screen', async () => {
    renderPage([FREE_TABLE]);

    expect(
      await screen.findByRole('heading', { name: 'Pedidos de mesa' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should offer the manager a way back to the hub', async () => {
    renderPage([FREE_TABLE], undefined, 'Manager');

    expect(
      await screen.findByRole('link', {
        name: 'Voltar para Painel do gerente',
      }),
    ).toHaveAttribute('href', '/manager');
  });

  it('should keep the way back while the floor is still loading', () => {
    // A promise that never settles holds the query pending, which is the only
    // way into the loading branch now that the real hook runs.
    listTablesMock.mockReset().mockReturnValue(new Promise(() => {}));
    roleHolder.value = 'Manager';
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TablesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('link', { name: 'Voltar para Painel do gerente' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
  });

  it('should show the table as open once it has been opened, not free again', async () => {
    createOrderMock.mockResolvedValue({ id: 'order-9' });
    const user = renderPage([FREE_TABLE], [OPEN_TABLE]);

    await user.click(await screen.findByRole('button', { name: 'Abrir mesa' }));

    expect(await screen.findByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('R$ 42,50')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Abrir mesa' }),
    ).not.toBeInTheDocument();
    expect(listTablesMock).toHaveBeenCalledTimes(2);
  });

  it('should not open a table twice while the first attempt is in flight', async () => {
    // A promise that never settles: the second tap lands inside the window the
    // guard exists for, which is also when the backend would refuse it.
    createOrderMock.mockReturnValue(new Promise(() => {}));
    const user = renderPage([FREE_TABLE]);

    await user.click(await screen.findByRole('button', { name: 'Abrir mesa' }));

    expect(screen.getByRole('button', { name: 'Abrindo…' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Abrindo…' }));

    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });
});
