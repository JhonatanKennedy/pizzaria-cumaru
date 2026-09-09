import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiError } from '@api/http-client';
import type { TMenuItem } from '@api/catalog.api';
import type { TOrderListing } from '@api/orders.api';
import { formatTime } from '@lib/format';
import { DeliveryDetailPage } from './delivery-detail-page';

const { ordersMock, menuMock, advanceMock } = vi.hoisted(() => ({
  ordersMock: vi.fn(),
  menuMock: vi.fn(),
  advanceMock: vi.fn(),
}));

vi.mock('../../hooks/use-orders', () => ({
  useOrders: () => ordersMock(),
}));

vi.mock('../../hooks/use-menu', () => ({
  useMenu: () => menuMock(),
}));

vi.mock('../../hooks/use-advance-delivery-status', () => ({
  useAdvanceDeliveryStatus: () => ({ mutateAsync: advanceMock }),
}));

vi.mock('../../hooks/use-add-item', () => ({
  useAddItem: () => ({ mutateAsync: vi.fn() }),
}));

const CALABRESA: TMenuItem = {
  id: 'catalog-pizza-1',
  name: 'Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: [],
};

const MENU: TMenuItem[] = [CALABRESA];

function deliveryOrder(overrides: Partial<TOrderListing> = {}): TOrderListing {
  return {
    id: 'order-1',
    waiterName: null,
    type: 'Delivery',
    status: 'Open',
    createdAt: '2026-09-09T10:00:00.000Z',
    totalPrice: 45,
    customerName: 'Maria Souza',
    phone: '(88) 99999-0000',
    address: 'Rua das Flores, 12',
    items: [
      {
        id: 'line-1',
        itemId: 'catalog-pizza-1',
        quantity: 1,
        status: 'Pending',
      },
    ],
    ...overrides,
  };
}

interface QueryOverrides {
  data?: unknown;
  isPending?: boolean;
  error?: ApiError | null;
}

function renderPage(
  order: TOrderListing,
  overrides: {
    orders?: QueryOverrides;
    menu?: QueryOverrides;
  } = {},
  routeOrderId: string = order.id,
): void {
  ordersMock.mockImplementation(() => ({
    data: [order],
    isPending: false,
    error: null,
    ...(overrides.orders ?? {}),
  }));
  menuMock.mockImplementation(() => ({
    data: MENU,
    isPending: false,
    error: null,
    ...(overrides.menu ?? {}),
  }));
  render(
    <MemoryRouter initialEntries={[`/manager/delivery/${routeOrderId}`]}>
      <Routes>
        <Route
          path="/manager/delivery/:orderId"
          element={<DeliveryDetailPage />}
        />
        <Route
          path="/manager/delivery"
          element={<div>Pedidos de entrega</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DeliveryDetailPage', () => {
  it('should render the customer details, total and enriched item lines', () => {
    renderPage(deliveryOrder());

    expect(
      screen.getByRole('heading', { name: 'Maria Souza' }),
    ).toBeInTheDocument();
    expect(screen.getByText('(88) 99999-0000')).toBeInTheDocument();
    expect(screen.getByText('Rua das Flores, 12')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('Total: R$ 45,00')).toBeInTheDocument();
    expect(screen.getByText('1× Calabresa')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '← Pedidos de entrega' }),
    ).toHaveAttribute('href', '/manager/delivery');
  });

  it('should advance an open order to Preparing through the action button', async () => {
    advanceMock.mockResolvedValue(null);
    const user = userEvent.setup();
    renderPage(deliveryOrder());

    await user.click(screen.getByRole('button', { name: 'Iniciar preparo' }));

    expect(advanceMock).toHaveBeenCalledWith({
      orderId: 'order-1',
      status: 'Preparing',
    });
  });

  it('should advance a preparing order to Out for delivery', async () => {
    advanceMock.mockResolvedValue(null);
    const user = userEvent.setup();
    renderPage(
      deliveryOrder({
        status: 'Preparing',
        items: [
          {
            id: 'line-1',
            itemId: 'catalog-pizza-1',
            quantity: 1,
            status: 'Preparing',
          },
        ],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Saiu para entrega' }));

    expect(advanceMock).toHaveBeenCalledWith({
      orderId: 'order-1',
      status: 'Out for delivery',
    });
  });

  it('should surface a transition rejection verbatim', async () => {
    advanceMock.mockRejectedValue(
      new ApiError(400, 'Invalid delivery status transition'),
    );
    const user = userEvent.setup();
    renderPage(deliveryOrder({ status: 'Preparing' }));

    await user.click(screen.getByRole('button', { name: 'Saiu para entrega' }));

    expect(
      await screen.findByText('Invalid delivery status transition'),
    ).toBeInTheDocument();
  });

  it('should show the delivery time and no action for a delivered order', () => {
    renderPage(
      deliveryOrder({
        status: 'Delivered',
        deliveredAt: '2026-09-09T18:30:00.000Z',
      }),
    );

    expect(screen.getByText('Entregue')).toBeInTheDocument();
    expect(
      screen.getByText(`Entregue às ${formatTime('2026-09-09T18:30:00.000Z')}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar como entregue' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Adicionar item')).not.toBeInTheDocument();
  });

  it('should allow adding items while the order is open', () => {
    renderPage(deliveryOrder());

    expect(
      screen.getByRole('heading', { name: 'Adicionar item' }),
    ).toBeInTheDocument();
  });

  it('should hide the add-items panel once the order is preparing', () => {
    renderPage(
      deliveryOrder({
        status: 'Preparing',
        items: [
          {
            id: 'line-1',
            itemId: 'catalog-pizza-1',
            quantity: 1,
            status: 'Preparing',
          },
        ],
      }),
    );

    expect(screen.queryByText('Adicionar item')).not.toBeInTheDocument();
  });

  it('should show the not-found message for an unknown order', () => {
    renderPage(deliveryOrder(), {}, 'order-unknown');

    expect(screen.getByText('Pedido não encontrado.')).toBeInTheDocument();
  });

  it('should show the loading state while the queries load', () => {
    renderPage(deliveryOrder(), { menu: { isPending: true } });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });
});
