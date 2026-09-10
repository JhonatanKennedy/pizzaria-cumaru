import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TIngredientListing, TMenuListing } from '@api/catalog.api';
import { MenuTab } from './index';

const { createItemMock, updateItemMock, deleteItemMock } = vi.hoisted(() => ({
  createItemMock: vi.fn(),
  updateItemMock: vi.fn(),
  deleteItemMock: vi.fn(),
}));

vi.mock('../../../../hooks/use-create-item', () => ({
  useCreateItem: () => ({ mutateAsync: createItemMock }),
}));

vi.mock('../../../../hooks/use-update-item', () => ({
  useUpdateItem: () => ({ mutateAsync: updateItemMock }),
}));

vi.mock('../../../../hooks/use-delete-item', () => ({
  useDeleteItem: () => ({ mutateAsync: deleteItemMock }),
}));

const ITEMS: TMenuListing = [
  {
    id: 'item-calabresa',
    name: 'Calabresa',
    description: 'Mussarela e calabresa',
    price: 45,
    category: 'PIZZA',
    requiresPreparation: true,
    available: true,
    ingredientIds: [],
  },
  {
    id: 'item-parmegiana',
    name: 'Parmegiana de Frango',
    description: 'Frango à parmegiana',
    price: 40,
    category: 'DISH',
    requiresPreparation: true,
    available: true,
    ingredientIds: [],
  },
  {
    id: 'item-suco',
    name: 'Suco Natural',
    description: 'Laranja',
    price: 8,
    category: 'DRINK',
    requiresPreparation: false,
    available: true,
    ingredientIds: [],
  },
];

const INGREDIENTS: TIngredientListing = [
  { id: 'ingredient-1', name: 'Mussarela', available: true },
];

function renderTab(): ReturnType<typeof userEvent.setup> {
  render(<MenuTab items={ITEMS} ingredients={INGREDIENTS} />);
  return userEvent.setup();
}

describe('MenuTab', () => {
  it('should list every item by default, across categories', () => {
    renderTab();

    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.getByText('Parmegiana de Frango')).toBeInTheDocument();
    expect(screen.getByText('Suco Natural')).toBeInTheDocument();
  });

  it('should filter the list by the picked category chip', async () => {
    const user = renderTab();

    await user.click(screen.getByRole('button', { name: 'Pizzas' }));

    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.queryByText('Parmegiana de Frango')).not.toBeInTheDocument();
    expect(screen.queryByText('Suco Natural')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bebidas' }));

    expect(screen.queryByText('Calabresa')).not.toBeInTheDocument();
    expect(screen.getByText('Suco Natural')).toBeInTheDocument();
  });

  it('should reset the filter with the Todas chip', async () => {
    const user = renderTab();

    await user.click(screen.getByRole('button', { name: 'Pratos' }));
    expect(screen.queryByText('Calabresa')).not.toBeInTheDocument();
    expect(screen.getByText('Parmegiana de Frango')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todas' }));

    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.getByText('Parmegiana de Frango')).toBeInTheDocument();
    expect(screen.getByText('Suco Natural')).toBeInTheDocument();
  });

  it('should offer only the Editar and Excluir actions per row', () => {
    renderTab();

    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(
      ITEMS.length,
    );
    expect(screen.getAllByRole('button', { name: 'Excluir' })).toHaveLength(
      ITEMS.length,
    );
    expect(
      screen.queryByRole('button', { name: 'Preço' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Ingredientes' }),
    ).not.toBeInTheDocument();
  });

  it('should open the single edit dialog pre-filled with the item', async () => {
    const user = renderTab();

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Editar item' });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'Editar Calabresa' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Calabresa');
    expect(within(dialog).getByLabelText('Exige preparo')).toBeChecked();
  });

  it('should remove the item behind an explicit confirmation', async () => {
    deleteItemMock.mockResolvedValue(undefined);
    const user = renderTab();

    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Excluir item' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(deleteItemMock).toHaveBeenCalledWith('item-calabresa');
  });
});
