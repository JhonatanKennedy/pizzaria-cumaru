import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TKitchenQueueOrder } from '../../api/kitchen.api';
import { QueueColumn } from './index';

const ORDERS: TKitchenQueueOrder[] = [
  {
    orderId: 'order-1',
    type: 'Local',
    createdAt: '2026-09-09T12:00:00Z',
    items: [
      {
        orderItemId: 'order-item-1',
        itemId: 'catalog-pizza-1',
        name: 'Calabresa',
        quantity: 2,
        status: 'Pending',
        createdAt: '2026-09-09T12:00:00Z',
        parts: [],
      },
      {
        orderItemId: 'order-item-2',
        itemId: 'catalog-pizza-2',
        name: 'Portuguesa',
        quantity: 1,
        status: 'Pending',
        createdAt: '2026-09-09T12:01:00Z',
        parts: [],
      },
    ],
  },
  {
    orderId: 'order-2',
    type: 'Local',
    createdAt: '2026-09-09T12:02:00Z',
    items: [
      {
        orderItemId: 'order-item-3',
        itemId: 'catalog-pizza-3',
        name: 'Margherita',
        quantity: 1,
        status: 'Preparing',
        createdAt: '2026-09-09T12:02:00Z',
        parts: [],
      },
    ],
  },
];

const onStartMock = vi.fn();
const onFinishMock = vi.fn();
const onCancelMock = vi.fn();

function renderColumn(orders: TKitchenQueueOrder[]): void {
  render(
    <QueueColumn
      title="Local"
      orders={orders}
      isBusy={() => false}
      onStart={onStartMock}
      onFinish={onFinishMock}
      onCancel={onCancelMock}
    />,
  );
}

describe('QueueColumn', () => {
  it('should render the tiles as a flat stack in the payload order', () => {
    renderColumn(ORDERS);

    const tiles = screen.getAllByRole('listitem');
    expect(tiles).toHaveLength(3);
    expect(within(tiles[0]).getByText('Calabresa')).toBeInTheDocument();
    expect(within(tiles[1]).getByText('Portuguesa')).toBeInTheDocument();
    expect(within(tiles[2]).getByText('Margherita')).toBeInTheDocument();
  });

  it('should not re-sort orders within the column', () => {
    renderColumn([ORDERS[1], ORDERS[0]]);

    const tiles = screen.getAllByRole('listitem');
    expect(within(tiles[0]).getByText('Margherita')).toBeInTheDocument();
    expect(within(tiles[1]).getByText('Calabresa')).toBeInTheDocument();
  });

  it('should show the empty state when there are no tiles', () => {
    renderColumn([]);

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhum item na fila')).toBeInTheDocument();
  });

  it('should start a preparation from a tile', async () => {
    const user = userEvent.setup();
    renderColumn(ORDERS);

    await user.click(
      within(screen.getAllByRole('listitem')[1]).getByRole('button', {
        name: 'Iniciar preparo',
      }),
    );

    expect(onStartMock).toHaveBeenCalledWith('order-1', 'order-item-2');
  });
});
