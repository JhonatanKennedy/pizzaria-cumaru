import { render, screen, within } from '@testing-library/react';
import type { TEnrichedSale } from '@pages/manager/business/enrich-sales';
import { formatTime } from '@lib/format';
import { SaleCard } from './index';

const LOCAL_SALE: TEnrichedSale = {
  id: 'sale-local',
  waiterName: 'João Garçom',
  type: 'Local',
  status: 'Closed',
  paymentType: 'Pix',
  tableId: '5',
  createdAt: '2026-09-07T14:30:00.000Z',
  closedAt: '2026-09-07T14:30:00.000Z',
  deliveredAt: null,
  totalPrice: 98,
  items: [
    {
      id: 'line-1',
      itemId: 'catalog-pizza-1',
      quantity: 2,
      status: 'Pending',
      name: 'Calabresa',
      category: 'PIZZA',
      unitPrice: 45,
    },
    {
      id: 'line-2',
      itemId: 'catalog-drink-1',
      quantity: 1,
      status: 'Pending',
      name: 'Coca-Cola',
      category: 'DRINK',
      unitPrice: 8,
    },
  ],
};

const DELIVERY_SALE: TEnrichedSale = {
  id: 'sale-delivery',
  waiterName: 'João Garçom',
  type: 'Delivery',
  status: 'Delivered',
  paymentType: null,
  createdAt: '2026-09-07T19:00:00.000Z',
  closedAt: null,
  deliveredAt: '2026-09-07T19:00:00.000Z',
  totalPrice: 60,
  items: [
    {
      id: 'line-3',
      itemId: 'gone-item',
      quantity: 1,
      status: 'Ready',
      name: 'Item removido do cardápio',
      category: null,
      unitPrice: null,
    },
  ],
};

describe('SaleCard', () => {
  it('should render a local sale with table, payment, time, waiter, total and items', () => {
    render(<SaleCard sale={LOCAL_SALE} />);

    const card = screen.getByRole('article');
    expect(within(card).getByText('Local')).toBeInTheDocument();
    expect(within(card).getByText('Mesa 5')).toBeInTheDocument();
    expect(within(card).getByText('Pix')).toBeInTheDocument();
    expect(
      within(card).getByText(formatTime('2026-09-07T14:30:00.000Z')),
    ).toBeInTheDocument();
    expect(within(card).getByText('João Garçom')).toBeInTheDocument();
    expect(within(card).getByText('R$ 98,00')).toBeInTheDocument();
    expect(within(card).getByText('2× Calabresa')).toBeInTheDocument();
    expect(within(card).getByText('Pizzas')).toBeInTheDocument();
    expect(within(card).getByText('R$ 90,00')).toBeInTheDocument();
    expect(within(card).getByText('1× Coca-Cola')).toBeInTheDocument();
  });

  it('should render a delivery sale without payment and without a table', () => {
    render(<SaleCard sale={DELIVERY_SALE} />);

    const card = screen.getByRole('article');
    expect(within(card).getByText('Entrega')).toBeInTheDocument();
    expect(within(card).getByText('—')).toBeInTheDocument();
    expect(
      within(card).getByText(formatTime('2026-09-07T19:00:00.000Z')),
    ).toBeInTheDocument();
    expect(within(card).queryByText(/Mesa/)).not.toBeInTheDocument();
    expect(
      within(card).getByText('1× Item removido do cardápio'),
    ).toBeInTheDocument();
    expect(within(card).queryByText('R$ 60,00')).toBeInTheDocument();
  });

  it('should render a null waiter name as a dash', () => {
    render(<SaleCard sale={{ ...LOCAL_SALE, waiterName: null }} />);

    const card = screen.getByRole('article');
    expect(within(card).getByText('—')).toBeInTheDocument();
  });
});
