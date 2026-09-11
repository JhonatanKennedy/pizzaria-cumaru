import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiError } from '@api/http-client';
import type { TOrderListing } from '@api/orders.api';
import { DeliveryPage } from './delivery-page';

const { ordersMock, createMock } = vi.hoisted(() => ({
  ordersMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('../../hooks/use-orders', () => ({
  useOrders: () => ordersMock(),
}));

vi.mock('../../hooks/use-create-delivery-order', () => ({
  useCreateDeliveryOrder: () => ({ mutateAsync: createMock }),
}));

vi.mock('@pages/auth/use-auth', () => ({
  useAuth: () => ({ user: { id: 7, login: 'ana.gerente', role: 'Manager' } }),
}));

const OPEN_DELIVERY: TOrderListing = {
  id: 'order-delivery-1',
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
      unitPrice: 45,
      parts: [],
    },
  ],
};

const PREPARING_DELIVERY: TOrderListing = {
  ...OPEN_DELIVERY,
  id: 'order-delivery-2',
  customerName: 'Pedro Lima',
  phone: '(85) 98888-1111',
  status: 'Preparing',
  items: [
    {
      id: 'line-2',
      itemId: 'catalog-drink-1',
      quantity: 2,
      status: 'Ready',
      unitPrice: 8,
      parts: [],
    },
  ],
};

const LOCAL_ORDER: TOrderListing = {
  id: 'order-local-1',
  waiterName: 'João Garçom',
  type: 'Local',
  status: 'Open',
  tableId: '3',
  createdAt: '2026-09-09T11:00:00.000Z',
  totalPrice: 98,
  items: [
    {
      id: 'line-3',
      itemId: 'catalog-pizza-2',
      quantity: 2,
      status: 'Pending',
      unitPrice: 49,
      parts: [],
    },
  ],
};

const ORDERS: TOrderListing[] = [
  OPEN_DELIVERY,
  PREPARING_DELIVERY,
  LOCAL_ORDER,
];

interface QueryOverrides {
  data?: unknown;
  isPending?: boolean;
  error?: ApiError | null;
}

function renderPage(overrides: { orders?: QueryOverrides } = {}): void {
  ordersMock.mockImplementation(() => ({
    data: ORDERS,
    isPending: false,
    error: null,
    ...(overrides.orders ?? {}),
  }));
  render(
    <MemoryRouter initialEntries={['/manager/delivery']}>
      <Routes>
        <Route path="/manager/delivery" element={<DeliveryPage />} />
        <Route
          path="/manager/delivery/:orderId"
          element={<div>Página de detalhes</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DeliveryPage', () => {
  it('should list only delivery orders with customer, phone and total', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Pedidos de entrega' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Maria Souza/ })).toHaveAttribute(
      'href',
      '/manager/delivery/order-delivery-1',
    );
    expect(screen.getByText('(88) 99999-0000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pedro Lima/ })).toHaveAttribute(
      'href',
      '/manager/delivery/order-delivery-2',
    );
    const orderLinks = screen
      .getAllByRole('link')
      .filter((link) =>
        link.getAttribute('href')?.startsWith('/manager/delivery/'),
      );
    expect(orderLinks).toHaveLength(2);
    expect(screen.queryByText('João Garçom')).not.toBeInTheDocument();
  });

  it('should show the empty message when no delivery order exists', () => {
    renderPage({ orders: { data: [] } });

    expect(
      screen.getByText('Nenhum pedido de entrega hoje.'),
    ).toBeInTheDocument();
  });

  it('should show the loading state while the orders load', () => {
    renderPage({ orders: { isPending: true } });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('should surface the orders error verbatim', () => {
    renderPage({
      orders: {
        data: null,
        error: new ApiError(500, 'Falha ao buscar os pedidos'),
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Falha ao buscar os pedidos',
    );
  });

  it('should create a delivery order and navigate to its detail', async () => {
    createMock.mockResolvedValue({ id: 'order-new' });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('button', { name: 'Novo pedido de entrega' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Novo pedido de entrega' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome do cliente'), 'Ana Costa');
    await user.type(screen.getByLabelText('Telefone'), '(88) 97777-2222');
    await user.type(
      screen.getByLabelText('Endereço de entrega'),
      'Av. Central, 100',
    );
    await user.click(screen.getByRole('button', { name: 'Criar pedido' }));

    expect(createMock).toHaveBeenCalledWith({
      userId: 7,
      customerName: 'Ana Costa',
      phone: '(88) 97777-2222',
      address: 'Av. Central, 100',
    });
    expect(await screen.findByText('Página de detalhes')).toBeInTheDocument();
  });
});
