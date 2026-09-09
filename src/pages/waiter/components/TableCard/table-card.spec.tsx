import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { TableCard } from './index';

const FREE_TABLE: TTableListingEntry = {
  id: 'table-1',
  number: 5,
  openOrder: null,
};

const OCCUPIED_TABLE: TTableListingEntry = {
  id: 'table-2',
  number: 6,
  openOrder: { orderId: 'order-1', totalPrice: 90 },
};

const onOpenTableMock = vi.fn();

describe('TableCard', () => {
  it('should offer opening a free table', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TableCard table={FREE_TABLE} onOpenTable={onOpenTableMock} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Mesa 5')).toBeInTheDocument();
    expect(screen.getByText('Livre')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir mesa' }));
    expect(onOpenTableMock).toHaveBeenCalledWith(FREE_TABLE);
  });

  it('should link an occupied table to its open order', () => {
    render(
      <MemoryRouter>
        <TableCard table={OCCUPIED_TABLE} onOpenTable={onOpenTableMock} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Mesa 6')).toBeInTheDocument();
    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(screen.getByText('R$ 90,00')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/waiter/orders/order-1',
    );
    expect(screen.queryByRole('button', { name: 'Abrir mesa' })).toBeNull();
  });
});
