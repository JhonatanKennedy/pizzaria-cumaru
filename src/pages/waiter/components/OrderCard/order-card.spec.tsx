import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { TEnrichedOrder } from '../../business/enrich';
import { OrderCard } from './index';

const ORDER: TEnrichedOrder = {
  id: 'order-1',
  waiterName: 'joao.garcom',
  type: 'LOCAL',
  status: 'Open',
  tableId: '5',
  createdAt: '2026-09-08T12:00:00Z',
  totalPrice: 90,
  items: [
    {
      id: 'line-1',
      itemId: 'catalog-pizza-1',
      quantity: 2,
      status: 'Pending',
      name: 'Calabresa',
      unitPrice: 45,
    },
  ],
};

function renderOrderCard(): void {
  render(
    <MemoryRouter>
      <OrderCard order={ORDER} />
    </MemoryRouter>,
  );
}

describe('OrderCard', () => {
  it('should show the table, the status and the responsible waiter', () => {
    renderOrderCard();

    expect(screen.getByText('Mesa 5')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('joao.garcom')).toBeInTheDocument();
  });

  it('should list items with quantity and preparation status', () => {
    renderOrderCard();

    expect(screen.getByText('2× Calabresa')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('should show the order total and link to the detail', () => {
    renderOrderCard();

    expect(screen.getByText('R$ 90,00')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/waiter/orders/order-1',
    );
  });
});
