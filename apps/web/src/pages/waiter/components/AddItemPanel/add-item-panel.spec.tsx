import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import type { TMenuItem } from '@api/catalog.api';
import { AddItemPanel } from './index';

const { addMock } = vi.hoisted(() => ({ addMock: vi.fn() }));

vi.mock('../../hooks/use-add-item', () => ({
  useAddItem: () => ({ mutateAsync: addMock }),
}));

const CHOCOLATE_G: TMenuItem = {
  id: 'catalog-pizza-chocolate-g',
  name: 'Chocolate G',
  description: 'Chocolate',
  price: 52,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: [],
};

const CALABRESA_G: TMenuItem = {
  id: 'catalog-pizza-calabresa-g',
  name: 'Calabresa G',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: [],
};

const CALABRESA_LEGACY: TMenuItem = {
  ...CALABRESA_G,
  id: 'catalog-pizza-legacy',
  name: 'Calabresa',
};

const MUSSARELA_LEGACY: TMenuItem = {
  ...CALABRESA_G,
  id: 'catalog-pizza-mussarela',
  name: 'Mussarela',
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
  ingredientIds: [],
};

const ITEMS: TMenuItem[] = [
  CHOCOLATE_G,
  CALABRESA_G,
  CALABRESA_LEGACY,
  MUSSARELA_LEGACY,
  AGUA,
];

function renderPanel(): ReturnType<typeof userEvent.setup> {
  render(<AddItemPanel orderId="order-1" items={ITEMS} />);
  return userEvent.setup();
}

describe('AddItemPanel', () => {
  it('should show only pizzas under the default category', () => {
    renderPanel();

    expect(screen.getByText('Chocolate G')).toBeInTheDocument();
    expect(screen.getByText('Calabresa G')).toBeInTheDocument();
    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.queryByText('Água')).not.toBeInTheDocument();
  });

  it('should filter items when another category chip is selected', async () => {
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Bebidas' }));

    expect(screen.getByText('Água')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate G')).not.toBeInTheDocument();
  });

  it('should reach the whole catalog through the Todas chip', async () => {
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Todas' }));

    expect(screen.getByText('Chocolate G')).toBeInTheDocument();
    expect(screen.getByText('Água')).toBeInTheDocument();
  });

  it('should offer the whole catalog when the search is outside the picked category', async () => {
    const user = renderPanel();

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar item' }),
      'agua',
    );

    expect(
      screen.getByText('Nenhum item em Pizzas para "agua".'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Buscar em todas as categorias' }),
    );

    expect(screen.getByText('Água')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate G')).not.toBeInTheDocument();
  });

  it('should say what the search looked for when it finds nothing', async () => {
    const user = renderPanel();

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar item' }),
      'xyz',
    );

    expect(
      screen.getByText('Nenhum item em Pizzas para "xyz".'),
    ).toBeInTheDocument();
  });

  it('should block unavailable items', () => {
    renderPanel();

    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mussarela/ })).toBeDisabled();
  });

  it('should show the composer only for sized pizzas', async () => {
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /^CalabresaR/ }));

    expect(screen.queryByText('Sabores')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Chocolate G/ }));

    expect(screen.getByText('Sabores')).toBeInTheDocument();
    expect(
      screen.getByText(/Chocolate \(base\) fica com 8 fatias/),
    ).toBeInTheDocument();
  });

  it('should add a composed pizza with the fatia parts in the payload', async () => {
    addMock.mockResolvedValue(null);
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /^Chocolate G/ }));
    await user.click(screen.getByRole('button', { name: 'Calabresa' }));
    await user.click(
      screen.getByRole('button', { name: 'Aumentar Calabresa G' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(addMock).toHaveBeenCalledWith({
      orderId: 'order-1',
      payload: {
        itemId: 'catalog-pizza-chocolate-g',
        quantity: 1,
        parts: [
          { name: 'Chocolate G', pieces: 6 },
          { name: 'Calabresa G', pieces: 2 },
        ],
      },
    });
  });

  it('should add a token-less pizza as a plain item with no parts', async () => {
    addMock.mockResolvedValue(null);
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /^CalabresaR/ }));
    await user.type(screen.getByLabelText('Observações'), 'sem cebola');
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(addMock).toHaveBeenCalledWith({
      orderId: 'order-1',
      payload: {
        itemId: 'catalog-pizza-legacy',
        quantity: 1,
        notes: 'sem cebola',
      },
    });
  });

  it('should drop the composition when the waiter switches items', async () => {
    addMock.mockResolvedValue(null);
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /^Chocolate G/ }));
    await user.click(screen.getByRole('button', { name: 'Calabresa' }));
    await user.click(screen.getByRole('button', { name: /^CalabresaR/ }));
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(addMock).toHaveBeenCalledWith({
      orderId: 'order-1',
      payload: { itemId: 'catalog-pizza-legacy', quantity: 1 },
    });
  });

  it('should display the backend error message when adding fails', async () => {
    addMock.mockRejectedValue(
      new ApiError(400, 'Cannot change a closed order'),
    );
    const user = renderPanel();

    await user.click(screen.getByRole('button', { name: /^CalabresaR/ }));
    await user.click(
      screen.getByRole('button', { name: 'Adicionar ao pedido' }),
    );

    expect(
      await screen.findByText('Cannot change a closed order'),
    ).toBeInTheDocument();
  });
});
