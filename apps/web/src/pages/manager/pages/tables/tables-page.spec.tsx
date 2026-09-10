import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TTableListingEntry } from '@api/tables.api';
import { TablesPage } from './tables-page';

const { listTablesMock, createTableMock, renameTableMock, deleteTableMock } =
  vi.hoisted(() => ({
    listTablesMock: vi.fn(),
    createTableMock: vi.fn(),
    renameTableMock: vi.fn(),
    deleteTableMock: vi.fn(),
  }));

// The API module is the mock seam: the real hooks and QueryClient run over
// it, so a successful mutation's invalidation is what refetches the list.
vi.mock('@api/tables.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@api/tables.api')>();
  return {
    ...actual,
    listTables: listTablesMock,
    createTable: createTableMock,
    renameTable: renameTableMock,
    deleteTable: deleteTableMock,
  };
});

const TABLES: TTableListingEntry[] = [
  { id: 'table-6', number: 6, openOrder: null },
  {
    id: 'table-5',
    number: 5,
    openOrder: { orderId: 'order-9', totalPrice: 42.5 },
  },
  { id: 'table-3', number: 3, openOrder: null },
];

function renderPage(
  firstListing: TTableListingEntry[],
  nextListing?: TTableListingEntry[],
): ReturnType<typeof userEvent.setup> {
  listTablesMock
    .mockReset()
    .mockResolvedValueOnce(firstListing)
    .mockResolvedValue(nextListing ?? firstListing);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TablesPage />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe('TablesPage', () => {
  it('should list the tables sorted by number with free and occupied state', async () => {
    renderPage(TABLES);

    const rows = await screen.findAllByRole('listitem');
    expect(within(rows[0]).getByText('Mesa 3')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Livre')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Mesa 5')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Ocupada')).toBeInTheDocument();
    expect(within(rows[1]).getByText('R$ 42,50')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Mesa 6')).toBeInTheDocument();
    expect(within(rows[2]).queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it('should show the empty state when no table is registered', async () => {
    renderPage([]);

    expect(
      await screen.findByText('Nenhuma mesa cadastrada.'),
    ).toBeInTheDocument();
  });

  it('should register a table and refetch the list', async () => {
    createTableMock.mockResolvedValue(undefined);
    const user = renderPage(TABLES, [
      ...TABLES,
      { id: 'table-11', number: 11, openOrder: null },
    ]);

    await screen.findByText('Mesa 3');
    await user.click(screen.getByRole('button', { name: 'Adicionar mesa' }));
    await user.type(screen.getByLabelText('Número da mesa'), '11');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText('Mesa 11')).toBeInTheDocument();
    expect(createTableMock).toHaveBeenCalledWith(11);
    expect(listTablesMock).toHaveBeenCalledTimes(2);
  });

  it('should renumber a table and refetch the list', async () => {
    renameTableMock.mockResolvedValue(undefined);
    const user = renderPage(TABLES, [
      { id: 'table-5', number: 12, openOrder: null },
      { id: 'table-6', number: 6, openOrder: null },
      { id: 'table-3', number: 3, openOrder: null },
    ]);

    const row = (await screen.findByText('Mesa 5')).closest('li');
    expect(row).not.toBeNull();
    await user.click(
      within(row as HTMLElement).getByRole('button', {
        name: 'Renumerar',
      }),
    );
    const dialog = within(screen.getByRole('dialog'));
    await user.clear(dialog.getByLabelText('Número da mesa'));
    await user.type(dialog.getByLabelText('Número da mesa'), '12');
    await user.click(dialog.getByRole('button', { name: 'Renumerar' }));

    expect(await screen.findByText('Mesa 12')).toBeInTheDocument();
    // The mock sits on the api seam, so it sees the api signature, not the
    // hook's object input.
    expect(renameTableMock).toHaveBeenCalledWith('table-5', 12);
    expect(listTablesMock).toHaveBeenCalledTimes(2);
  });

  it('should remove a table after confirmation and refetch the list', async () => {
    deleteTableMock.mockResolvedValue(undefined);
    const user = renderPage(TABLES, [
      { id: 'table-6', number: 6, openOrder: null },
      { id: 'table-5', number: 5, openOrder: null },
    ]);

    const row = (await screen.findByText('Mesa 3')).closest('li');
    expect(row).not.toBeNull();
    await user.click(
      within(row as HTMLElement).getByRole('button', { name: 'Remover' }),
    );
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Remover' }));

    await screen.findByText('Mesa 5');
    expect(deleteTableMock).toHaveBeenCalledWith('table-3');
    expect(listTablesMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Mesa 3')).not.toBeInTheDocument();
  });
});
