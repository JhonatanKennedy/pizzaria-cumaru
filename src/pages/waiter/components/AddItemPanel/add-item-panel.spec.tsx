import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import type { TMenuItem } from '../../business/schemas';
import { AddItemPanel } from './index';

const { addMock } = vi.hoisted(() => ({ addMock: vi.fn() }));

vi.mock('../../hooks/use-add-item', () => ({
  useAddItem: () => ({ mutateAsync: addMock }),
}));

const CALABRESA: TMenuItem = {
  id: 'catalog-pizza-1',
  name: 'Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
};

const MUSSARELA: TMenuItem = {
  id: 'catalog-pizza-2',
  name: 'Mussarela',
  description: 'Mussarela',
  price: 40,
  category: 'PIZZA',
  requiresPreparation: true,
  available: false,
};

const AGUA: TMenuItem = {
  id: 'catalog-drink-1',
  name: 'Água',
  description: 'Água mineral',
  price: 8,
  category: 'DRINK',
  requiresPreparation: false,
  available: true,
};

const ITEMS: TMenuItem[] = [CALABRESA, MUSSARELA, AGUA];

function renderPanel(): ReturnType<typeof userEvent.setup> {
  render(<AddItemPanel orderId="order-1" items={ITEMS} />);
  return userEvent.setup();
}

describe('AddItemPanel', () => {
  it('should show only pizzas under the default category', () => {
    renderPanel();

    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.getByText('Mussarela')).toBeInTheDocument();
    expect(screen.queryByText('Água')).not.toBeInTheDocument();
  });

  it('should filter items when another category chip is selected', async () => {
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Bebidas' }));

    expect(screen.getByText('Água')).toBeInTheDocument();
    expect(screen.queryByText('Calabresa')).not.toBeInTheDocument();
  });

  it('should block unavailable items', () => {
    renderPanel();

    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mussarela/ })).toBeDisabled();
  });

  it('should show the flavors field only for pizzas', async () => {
    const user = renderPanel();

    expect(
      screen.queryByLabelText('Sabores (separados por vírgula)'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Calabresa/ }));

    expect(
      screen.getByLabelText('Sabores (separados por vírgula)'),
    ).toBeInTheDocument();
  });

  it('should add the selected pizza with quantity and flavors', async () => {
    addMock.mockResolvedValue(null);
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /Calabresa/ }));
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '2');
    await user.type(
      screen.getByLabelText('Sabores (separados por vírgula)'),
      'Calabresa, Portuguesa',
    );
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(addMock).toHaveBeenCalledWith({
      orderId: 'order-1',
      payload: {
        itemId: 'catalog-pizza-1',
        quantity: 2,
        flavors: ['Calabresa', 'Portuguesa'],
      },
    });
  });

  it('should display the backend error message when adding fails', async () => {
    addMock.mockRejectedValue(
      new ApiError(400, 'Cannot change a closed order'),
    );
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /Calabresa/ }));
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(
      await screen.findByText('Cannot change a closed order'),
    ).toBeInTheDocument();
  });
});
