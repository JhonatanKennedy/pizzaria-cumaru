import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import type { TMenuItem } from '@api/catalog.api';
import { AddItemsPanel } from './index';

const { addMock } = vi.hoisted(() => ({ addMock: vi.fn() }));

vi.mock('../../../../hooks/use-add-item', () => ({
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
  ingredientIds: [],
};

const MUSSARELA: TMenuItem = {
  id: 'catalog-pizza-2',
  name: 'Mussarela',
  description: 'Mussarela',
  price: 40,
  category: 'PIZZA',
  requiresPreparation: true,
  available: false,
  ingredientIds: [],
};

const AGUA: TMenuItem = {
  id: 'catalog-drink-1',
  name: 'Água',
  description: 'Água mineral',
  price: 8,
  category: 'DRINK',
  requiresPreparation: false,
  available: true,
  ingredientIds: [],
};

const ITEMS: TMenuItem[] = [CALABRESA, MUSSARELA, AGUA];

function renderPanel(): ReturnType<typeof userEvent.setup> {
  render(<AddItemsPanel orderId="order-1" items={ITEMS} />);
  return userEvent.setup();
}

describe('AddItemsPanel', () => {
  it('should block unavailable items with an Indisponível marker', () => {
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

  it('should add the selected pizza with quantity, flavors and notes', async () => {
    addMock.mockResolvedValue(null);
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /Calabresa/ }));
    await user.clear(screen.getByLabelText('Quantidade'));
    await user.type(screen.getByLabelText('Quantidade'), '2');
    await user.type(
      screen.getByLabelText('Sabores (separados por vírgula)'),
      'Calabresa, Portuguesa',
    );
    await user.type(screen.getByLabelText('Observações'), 'Bem assada');
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(addMock).toHaveBeenCalledWith({
      orderId: 'order-1',
      payload: {
        itemId: 'catalog-pizza-1',
        quantity: 2,
        flavors: ['Calabresa', 'Portuguesa'],
        notes: 'Bem assada',
      },
    });
  });

  it('should display the backend error message when adding fails', async () => {
    addMock.mockRejectedValue(new ApiError(400, 'Item is unavailable'));
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /Calabresa/ }));
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(await screen.findByText('Item is unavailable')).toBeInTheDocument();
  });
});
