import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TKitchenQueueItem } from '../../api/kitchen.api';
import { ItemTile } from './index';

const PENDING_ITEM: TKitchenQueueItem = {
  orderItemId: 'order-item-1',
  itemId: 'catalog-pizza-1',
  name: 'Calabresa',
  quantity: 2,
  status: 'Pending',
  createdAt: '2026-09-09T12:00:00Z',
  notes: 'sem cebola',
  parts: [],
};

const PREPARING_ITEM: TKitchenQueueItem = {
  ...PENDING_ITEM,
  orderItemId: 'order-item-2',
  name: 'Portuguesa',
  quantity: 1,
  status: 'Preparing',
};

const onStartMock = vi.fn();
const onFinishMock = vi.fn();
const onCancelMock = vi.fn();

function renderTile(item: TKitchenQueueItem, isBusy = false): void {
  render(
    <ItemTile
      orderId="order-1"
      item={item}
      isBusy={isBusy}
      onStart={onStartMock}
      onFinish={onFinishMock}
      onCancel={onCancelMock}
    />,
  );
}

describe('ItemTile', () => {
  it('should show name, quantity, status and notes', () => {
    renderTile(PENDING_ITEM);

    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.getByText('2×')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('sem cebola')).toBeInTheDocument();
  });

  it('should not render a notes line when the item has none', () => {
    renderTile({ ...PREPARING_ITEM, notes: null });

    expect(screen.queryByText('sem cebola')).not.toBeInTheDocument();
  });

  it('should not render a composition line for a plain item', () => {
    renderTile({ ...PENDING_ITEM, parts: [] });

    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('should show the composition line on a composed pizza tile', () => {
    renderTile({
      ...PENDING_ITEM,
      name: 'Mussarela G',
      quantity: 1,
      parts: [
        { name: 'Mussarela G', pieces: 4 },
        { name: 'Chocolate G', pieces: 4 },
      ],
    });

    expect(screen.getByText('Mussarela G')).toBeInTheDocument();
    expect(
      screen.getByText('Mussarela 1/2 · Chocolate 1/2'),
    ).toBeInTheDocument();
  });

  it('should paint the tile with its status color', () => {
    renderTile(PENDING_ITEM);
    expect(screen.getByRole('listitem')).toHaveClass('bg-item-pending');

    renderTile(PREPARING_ITEM);
    const tiles = screen.getAllByRole('listitem');
    expect(tiles[0]).toHaveClass('bg-item-pending');
    expect(tiles[1]).toHaveClass('bg-item-preparing');
  });

  it('should offer the start action on a pending tile', () => {
    renderTile(PENDING_ITEM);

    expect(
      screen.getByRole('button', { name: 'Iniciar preparo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Finalizar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancelar preparo' }),
    ).not.toBeInTheDocument();
  });

  it('should offer the finish and cancel actions on a preparing tile', () => {
    renderTile(PREPARING_ITEM);

    expect(
      screen.getByRole('button', { name: 'Finalizar' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar preparo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Iniciar preparo' }),
    ).not.toBeInTheDocument();
  });

  it('should start the preparation of a pending item', async () => {
    const user = userEvent.setup();
    renderTile(PENDING_ITEM);

    await user.click(screen.getByRole('button', { name: 'Iniciar preparo' }));

    expect(onStartMock).toHaveBeenCalledWith('order-1', 'order-item-1');
  });

  it('should finish a preparation item', async () => {
    const user = userEvent.setup();
    renderTile(PREPARING_ITEM);

    await user.click(screen.getByRole('button', { name: 'Finalizar' }));

    expect(onFinishMock).toHaveBeenCalledWith('order-1', 'order-item-2');
  });

  it('should cancel a preparation through the dialog with the reason', async () => {
    onCancelMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderTile(PREPARING_ITEM);

    await user.click(screen.getByRole('button', { name: 'Cancelar preparo' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.type(dialog.getByLabelText('Motivo'), 'Item queimado');
    await user.click(dialog.getByRole('button', { name: 'Cancelar preparo' }));

    expect(onCancelMock).toHaveBeenCalledWith(
      'order-1',
      'order-item-2',
      'Item queimado',
    );
  });

  it('should disable the actions while the tile is busy', () => {
    renderTile(PREPARING_ITEM, true);

    expect(screen.getByRole('button', { name: 'Finalizar' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Cancelar preparo' }),
    ).toBeDisabled();
  });

  it('should keep the tile anonymous — no order identifiers or table text', () => {
    renderTile(PENDING_ITEM);

    expect(screen.queryByText('order-1')).not.toBeInTheDocument();
    expect(screen.queryByText(/mesa/i)).not.toBeInTheDocument();
    expect(screen.queryByText('order-item-1')).not.toBeInTheDocument();
  });
});
