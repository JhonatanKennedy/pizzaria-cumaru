import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiError } from '@api/http-client';
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

function renderOrderDetail(
  canCloseOrder = false,
): ReturnType<typeof userEvent.setup> {
  render(
    <MemoryRouter initialEntries={['/waiter/orders/o1']}>
      <Routes>
        <Route
          path="/waiter/orders/:orderId"
          element={<OrderDetailPage canCloseOrder={canCloseOrder} />}
        />
        <Route path="/waiter/tables" element={<div>Mesas</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

interface OrderItemFixture {
  id: string;
  itemId: string;
  quantity: number;
  status: string | null;
  unitPrice: number;
  parts?: unknown[];
}

interface OrderFixture {
  id?: string;
  status?: string;
  totalPrice?: number;
  items: OrderItemFixture[];
}

function seedOrder(order: OrderFixture): void {
  orders.value = [
    {
      id: 'o1',
      waiterName: null,
      type: 'Local',
      status: order.status ?? 'Open',
      tableId: 't1',
      createdAt: '2026-09-09T12:00:00.000Z',
      totalPrice: order.totalPrice ?? 0,
      items: order.items.map((item) => ({ parts: [], ...item })),
    },
  ] as unknown as TOrderListing[];
}

function seedMenu(
  items: { id: string; name: string; price: number; category?: string }[],
): void {
  menu.value = items.map((item) => ({
    id: item.id,
    name: item.name,
    description: '',
    price: item.price,
    category: item.category ?? 'PIZZA',
    requiresPreparation: item.category ? item.category !== 'DRINK' : true,
    available: true,
    ingredientIds: [],
  })) as unknown as TMenuListing;
}

function seedTables(): void {
  tables.value = [
    { id: 't1', number: 5, openOrder: null },
  ] as unknown as TTableListing[];
}

function seedDefaults(): void {
  seedTables();
  cancelItemMock.mockReset();
  cancelOrderMock.mockReset();
  closeOrderMock.mockReset();
}

describe('OrderDetailPage', () => {
  it('should cancel an item through a plain confirmation, without collecting a reason', async () => {
    seedDefaults();
    seedMenu([
      { id: 'i-coke', name: 'Coca-Cola', price: 9, category: 'DRINK' },
    ]);
    seedOrder({
      totalPrice: 9,
      items: [
        {
          id: 'oi-coke',
          itemId: 'i-coke',
          quantity: 1,
          status: null,
          unitPrice: 9,
        },
      ],
    });
    cancelItemMock.mockResolvedValue(undefined);

    const user = renderOrderDetail();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar Coca-Cola' });
    expect(within(dialog).queryByLabelText('Motivo')).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Cancelar item' }),
    );

    expect(cancelItemMock).toHaveBeenCalledWith({
      orderId: 'o1',
      orderItemId: 'oi-coke',
    });
  });

  it('should cancel the whole open order through a plain confirmation and return to the tables screen', async () => {
    seedDefaults();
    seedMenu([
      { id: 'i-coke', name: 'Coca-Cola', price: 9, category: 'DRINK' },
    ]);
    seedOrder({
      totalPrice: 9,
      items: [
        {
          id: 'oi-coke',
          itemId: 'i-coke',
          quantity: 1,
          status: null,
          unitPrice: 9,
        },
      ],
    });
    cancelOrderMock.mockResolvedValue(undefined);

    const user = renderOrderDetail();

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));
    const dialog = screen.getByRole('dialog', {
      name: 'Cancelar pedido da mesa 5',
    });
    expect(within(dialog).queryByLabelText('Motivo')).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Cancelar pedido' }),
    );

    expect(cancelOrderMock).toHaveBeenCalledWith({ orderId: 'o1' });
    expect(await screen.findByText('Mesas')).toBeInTheDocument();
  });

  it('should show a composed pizza with its composition and the recorded price', () => {
    seedDefaults();
    seedMenu([
      { id: 'i-mussarela-g', name: 'Mussarela G', price: 40 },
      { id: 'i-chocolate-g', name: 'Chocolate G', price: 52 },
      { id: 'i-coke', name: 'Coca-Cola', price: 9, category: 'DRINK' },
    ]);
    seedOrder({
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
        },
      ],
    });

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

  it('should offer no cancellation action for an item whose preparation started', () => {
    seedDefaults();
    seedMenu([{ id: 'i-calabresa', name: 'Calabresa', price: 45 }]);
    seedOrder({
      totalPrice: 45,
      items: [
        {
          id: 'oi-calabresa',
          itemId: 'i-calabresa',
          quantity: 1,
          status: 'Preparing',
          unitPrice: 45,
        },
      ],
    });

    renderOrderDetail();

    expect(
      screen.queryByRole('button', { name: 'Cancelar' }),
    ).not.toBeInTheDocument();
  });

  it('should show no close action to a waiter', () => {
    seedDefaults();
    seedMenu([{ id: 'i-calabresa', name: 'Calabresa', price: 45 }]);
    seedOrder({
      totalPrice: 45,
      items: [
        {
          id: 'oi-calabresa',
          itemId: 'i-calabresa',
          quantity: 1,
          status: 'Pending',
          unitPrice: 45,
        },
      ],
    });

    renderOrderDetail();

    expect(
      screen.queryByRole('button', { name: 'Fechar conta' }),
    ).not.toBeInTheDocument();
  });

  it('should disable Fechar conta with the hint while an item is still in preparation', () => {
    seedDefaults();
    seedMenu([{ id: 'i-calabresa', name: 'Calabresa', price: 45 }]);
    seedOrder({
      totalPrice: 45,
      items: [
        {
          id: 'oi-calabresa',
          itemId: 'i-calabresa',
          quantity: 1,
          status: 'Pending',
          unitPrice: 45,
        },
      ],
    });

    renderOrderDetail(true);

    expect(screen.getByRole('button', { name: 'Fechar conta' })).toBeDisabled();
    expect(
      screen.getByText('Ainda há itens em preparação'),
    ).toBeInTheDocument();
  });

  it('should enable Fechar conta once every kitchen item is Ready', () => {
    seedDefaults();
    seedMenu([{ id: 'i-calabresa', name: 'Calabresa', price: 45 }]);
    seedOrder({
      totalPrice: 45,
      items: [
        {
          id: 'oi-calabresa',
          itemId: 'i-calabresa',
          quantity: 1,
          status: 'Ready',
          unitPrice: 45,
        },
      ],
    });

    renderOrderDetail(true);

    expect(screen.getByRole('button', { name: 'Fechar conta' })).toBeEnabled();
    expect(
      screen.queryByText('Ainda há itens em preparação'),
    ).not.toBeInTheDocument();
  });

  it('should enable Fechar conta for an order that never entered the kitchen', () => {
    seedDefaults();
    seedMenu([
      { id: 'i-coke', name: 'Coca-Cola', price: 9, category: 'DRINK' },
    ]);
    seedOrder({
      totalPrice: 18,
      items: [
        {
          id: 'oi-coke',
          itemId: 'i-coke',
          quantity: 2,
          status: null,
          unitPrice: 9,
        },
      ],
    });

    renderOrderDetail(true);

    expect(screen.getByRole('button', { name: 'Fechar conta' })).toBeEnabled();
    expect(
      screen.queryByText('Ainda há itens em preparação'),
    ).not.toBeInTheDocument();
  });

  it('should surface a backend close refusal verbatim in the close dialog', async () => {
    seedDefaults();
    seedMenu([
      { id: 'i-coke', name: 'Coca-Cola', price: 9, category: 'DRINK' },
    ]);
    seedOrder({
      totalPrice: 18,
      items: [
        {
          id: 'oi-coke',
          itemId: 'i-coke',
          quantity: 2,
          status: null,
          unitPrice: 9,
        },
      ],
    });
    closeOrderMock.mockRejectedValue(
      new ApiError(409, 'Cannot close an order with items in preparation'),
    );

    const user = renderOrderDetail(true);

    await user.click(screen.getByRole('button', { name: 'Fechar conta' }));
    const dialog = screen.getByRole('dialog', {
      name: 'Fechar conta da mesa 5',
    });
    await user.click(within(dialog).getByRole('radio', { name: 'Cartão' }));
    await user.click(
      within(dialog).getByRole('button', { name: 'Fechar conta' }),
    );

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Cannot close an order with items in preparation',
    );
  });
});
