import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { TOrderListing } from '@api/orders.api';
import type { TMenuListing } from '@api/catalog.api';
import type { TTableListing } from '@api/tables.api';
import { OrderDetailPage } from './order-detail';

const {
  orders,
  menu,
  tables,
  cancelItemMock,
  cancelOrderMock,
  closeOrderMock,
  updateItemQuantityMock,
  addItemMock,
} = vi.hoisted(() => ({
  orders: { value: [] as unknown[] },
  menu: { value: [] as unknown[] },
  tables: { value: [] as unknown[] },
  cancelItemMock: vi.fn(),
  cancelOrderMock: vi.fn(),
  closeOrderMock: vi.fn(),
  updateItemQuantityMock: vi.fn(),
  addItemMock: vi.fn(),
}));

vi.mock('../hooks/use-orders', () => ({
  useOrders: () => ({ isPending: false, data: orders.value, error: null }),
}));
vi.mock('../hooks/use-menu', () => ({
  useMenu: () => ({ isPending: false, data: menu.value, error: null }),
}));
vi.mock('../hooks/use-tables', () => ({
  useTables: () => ({ isPending: false, data: tables.value, error: null }),
}));
vi.mock('../hooks/use-cancel-item', () => ({
  useCancelItem: () => ({ mutateAsync: cancelItemMock }),
}));
vi.mock('../hooks/use-cancel-order', () => ({
  useCancelOrder: () => ({ mutateAsync: cancelOrderMock }),
}));
vi.mock('../hooks/use-close-order', () => ({
  useCloseOrder: () => ({ mutateAsync: closeOrderMock }),
}));
vi.mock('../hooks/use-update-item-quantity', () => ({
  useUpdateItemQuantity: () => ({ mutateAsync: updateItemQuantityMock }),
}));
vi.mock('../hooks/use-add-item', () => ({
  useAddItem: () => ({ mutateAsync: addItemMock }),
}));

function renderOrderDetail(): ReturnType<typeof userEvent.setup> {
  render(
    <MemoryRouter initialEntries={['/waiter/orders/o1']}>
      <Routes>
        <Route path="/waiter/orders/:orderId" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('OrderDetailPage', () => {
  it('should offer cancelling an item that never requires preparation and remove it with a reason', async () => {
    orders.value = [
      {
        id: 'o1',
        waiterName: null,
        type: 'Local',
        status: 'Open',
        tableId: 't1',
        createdAt: '2026-09-09T12:00:00.000Z',
        totalPrice: 18,
        items: [
          {
            id: 'oi-coke',
            itemId: 'i-coke',
            quantity: 2,
            status: null,
            unitPrice: 9,
            parts: [],
          },
          {
            id: 'oi-calabresa',
            itemId: 'i-calabresa',
            quantity: 1,
            status: 'Preparing',
            unitPrice: 45,
            parts: [],
          },
        ],
      },
    ] as unknown as TOrderListing[];
    menu.value = [
      {
        id: 'i-coke',
        name: 'Coca-Cola',
        description: '',
        price: 9,
        category: 'BEBIDA',
        requiresPreparation: false,
        available: true,
        ingredientIds: [],
      },
      {
        id: 'i-calabresa',
        name: 'Calabresa',
        description: '',
        price: 45,
        category: 'PIZZA',
        requiresPreparation: true,
        available: true,
        ingredientIds: [],
      },
    ] as unknown as TMenuListing;
    tables.value = [
      { id: 't1', number: 5, openOrder: null },
    ] as unknown as TTableListing;
    cancelItemMock.mockResolvedValue(undefined);

    const user = renderOrderDetail();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    const dialog = screen.getByRole('dialog', {
      name: 'Cancelar Coca-Cola',
    });
    await user.type(screen.getByLabelText('Motivo'), 'Cliente desistiu');
    await user.click(
      within(dialog).getByRole('button', { name: 'Cancelar item' }),
    );

    expect(cancelItemMock).toHaveBeenCalledWith({
      orderId: 'o1',
      orderItemId: 'oi-coke',
      reason: 'Cliente desistiu',
    });
  });

  it('should show a composed pizza with its composition and the recorded price', () => {
    orders.value = [
      {
        id: 'o1',
        waiterName: null,
        type: 'Local',
        status: 'Open',
        tableId: 't1',
        createdAt: '2026-09-09T12:00:00.000Z',
        totalPrice: 61,
        items: [
          {
            id: 'oi-split',
            itemId: 'i-mussarela-g',
            quantity: 1,
            status: null,
            // Recorded at the max-flavor price (Chocolate G), not the base's
            // catalog price — the line must show what was charged.
            unitPrice: 52,
            parts: [
              { name: 'Mussarela G', pieces: 4 },
              { name: 'Chocolate G', pieces: 4 },
            ],
          },
          {
            id: 'oi-coke',
            itemId: 'i-coke',
            quantity: 1,
            status: null,
            unitPrice: 9,
            parts: [],
          },
        ],
      },
    ] as unknown as TOrderListing[];
    menu.value = [
      {
        id: 'i-mussarela-g',
        name: 'Mussarela G',
        description: '',
        price: 40,
        category: 'PIZZA',
        requiresPreparation: true,
        available: true,
        ingredientIds: [],
      },
      {
        id: 'i-chocolate-g',
        name: 'Chocolate G',
        description: '',
        price: 52,
        category: 'PIZZA',
        requiresPreparation: true,
        available: true,
        ingredientIds: [],
      },
      {
        id: 'i-coke',
        name: 'Coca-Cola',
        description: '',
        price: 9,
        category: 'BEBIDA',
        requiresPreparation: false,
        available: true,
        ingredientIds: [],
      },
    ] as unknown as TMenuListing;
    tables.value = [
      { id: 't1', number: 5, openOrder: null },
    ] as unknown as TTableListing;

    renderOrderDetail();

    // Scoped to the items card: the add panel below also lists pizza tiles.
    const itemsCard = screen
      .getByRole('heading', { name: 'Itens do pedido' })
      .closest('.card');
    expect(itemsCard).not.toBeNull();
    const itemsList = within(itemsCard as HTMLElement);

    expect(itemsList.getByText('Mussarela G')).toBeInTheDocument();
    expect(
      itemsList.getByText('Mussarela 1/2 · Chocolate 1/2'),
    ).toBeInTheDocument();
    // The recorded max-flavor price (52), not the base's catalog price (40).
    expect(itemsList.getByText('R$ 52,00')).toBeInTheDocument();
    expect(itemsList.queryByText('R$ 40,00')).not.toBeInTheDocument();
    // The plain drink line carries no composition.
    const cokeRow = itemsList.getByText('Coca-Cola').closest('li');
    expect(cokeRow).not.toBeNull();
    expect(
      within(cokeRow as HTMLElement).queryByText(/·/),
    ).not.toBeInTheDocument();
  });

  it('should offer no cancellation action for an item whose preparation started', async () => {
    orders.value = [
      {
        id: 'o1',
        waiterName: null,
        type: 'Local',
        status: 'Open',
        tableId: 't1',
        createdAt: '2026-09-09T12:00:00.000Z',
        totalPrice: 45,
        items: [
          {
            id: 'oi-calabresa',
            itemId: 'i-calabresa',
            quantity: 1,
            status: 'Preparing',
            unitPrice: 45,
            parts: [],
          },
        ],
      },
    ] as unknown as TOrderListing[];
    menu.value = [
      {
        id: 'i-calabresa',
        name: 'Calabresa',
        description: '',
        price: 45,
        category: 'PIZZA',
        requiresPreparation: true,
        available: true,
        ingredientIds: [],
      },
    ] as unknown as TMenuListing;
    tables.value = [
      { id: 't1', number: 5, openOrder: null },
    ] as unknown as TTableListing;

    renderOrderDetail();

    expect(
      screen.queryByRole('button', { name: 'Cancelar' }),
    ).not.toBeInTheDocument();
  });
});
