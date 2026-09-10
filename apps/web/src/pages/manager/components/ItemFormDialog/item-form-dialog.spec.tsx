import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TIngredientListing, TMenuItem } from '@api/catalog.api';
import { ApiError } from '@api/http-client';
import { ItemFormDialog } from './index';

const { createMock, updateMock, onCloseMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../hooks/use-create-item', () => ({
  useCreateItem: () => ({ mutateAsync: createMock }),
}));

vi.mock('../../hooks/use-update-item', () => ({
  useUpdateItem: () => ({ mutateAsync: updateMock }),
}));

const INGREDIENTS: TIngredientListing = [
  { id: 'ingredient-1', name: 'Mussarela', available: true },
  { id: 'ingredient-2', name: 'Pepperoni', available: false },
];

const ITEM: TMenuItem = {
  id: 'item-calabresa',
  name: 'Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: ['ingredient-1'],
};

function renderCreateDialog(): ReturnType<typeof userEvent.setup> {
  render(<ItemFormDialog ingredients={INGREDIENTS} onClose={onCloseMock} />);
  return userEvent.setup();
}

function renderEditDialog(): ReturnType<typeof userEvent.setup> {
  render(
    <ItemFormDialog
      ingredients={INGREDIENTS}
      onClose={onCloseMock}
      item={ITEM}
    />,
  );
  return userEvent.setup();
}

describe('ItemFormDialog', () => {
  it('should show validation errors when submitted empty', async () => {
    const user = renderCreateDialog();

    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Descrição é obrigatória')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create the item and close', async () => {
    createMock.mockResolvedValue(undefined);
    const user = renderCreateDialog();

    await user.type(screen.getByLabelText('Nome'), 'Calabresa Especial');
    await user.type(
      screen.getByLabelText('Descrição'),
      'Mussarela e calabresa',
    );
    await user.type(screen.getByLabelText('Preço'), '55');
    await user.click(screen.getByLabelText('Exige preparo'));
    await user.click(screen.getByLabelText('Mussarela'));
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(createMock).toHaveBeenCalledWith({
      name: 'Calabresa Especial',
      description: 'Mussarela e calabresa',
      price: 55,
      category: 'PIZZA',
      requiresPreparation: true,
      ingredientIds: ['ingredient-1'],
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should submit an empty ingredient list when none is selected', async () => {
    createMock.mockResolvedValue(undefined);
    const user = renderCreateDialog();

    await user.type(screen.getByLabelText('Nome'), 'Suco Natural');
    await user.type(screen.getByLabelText('Descrição'), 'Laranja');
    await user.type(screen.getByLabelText('Preço'), '8');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'DRINK');
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientIds: [] }),
    );
  });

  it('should show which ingredients are unavailable', () => {
    renderCreateDialog();

    expect(
      screen.getByRole('checkbox', { name: /Pepperoni/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Indisponível')).toHaveLength(1);
  });

  it('should pre-check the preparation flag when a kitchen category is picked', async () => {
    const user = renderCreateDialog();

    await user.selectOptions(screen.getByLabelText('Categoria'), 'DRINK');
    expect(screen.getByLabelText('Exige preparo')).not.toBeChecked();

    await user.selectOptions(screen.getByLabelText('Categoria'), 'DISH');
    expect(screen.getByLabelText('Exige preparo')).toBeChecked();

    await user.selectOptions(screen.getByLabelText('Categoria'), 'PIZZA');
    expect(screen.getByLabelText('Exige preparo')).toBeChecked();
  });

  it('should refuse saving a kitchen item with the flag unchecked', async () => {
    const user = renderCreateDialog();

    await user.type(screen.getByLabelText('Nome'), 'Parmegiana de Frango');
    await user.type(screen.getByLabelText('Descrição'), 'Frango à parmegiana');
    await user.type(screen.getByLabelText('Preço'), '40');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'DISH');
    await user.click(screen.getByLabelText('Exige preparo'));
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(
      await screen.findByText('Pizzas e pratos exigem "Exige preparo"'),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should pre-fill the item fields when editing', () => {
    renderEditDialog();

    expect(
      screen.getByRole('dialog', { name: 'Editar item' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Editar Calabresa' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Calabresa');
    expect(screen.getByLabelText('Descrição')).toHaveValue(
      'Mussarela e calabresa',
    );
    expect(screen.getByLabelText('Preço')).toHaveValue(45);
    expect(screen.getByLabelText('Exige preparo')).toBeChecked();
    expect(screen.getByLabelText('Mussarela')).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: /Pepperoni/ }),
    ).not.toBeChecked();
    expect(screen.getByLabelText('Categoria')).toHaveValue('PIZZA');
    expect(screen.getByLabelText('Categoria')).toBeDisabled();
  });

  it('should save the edit through one update payload and close', async () => {
    updateMock.mockResolvedValue(undefined);
    const user = renderEditDialog();

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Calabresa Reforçada');
    await user.clear(screen.getByLabelText('Preço'));
    await user.type(screen.getByLabelText('Preço'), '55');
    await user.click(screen.getByLabelText('Mussarela'));
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(updateMock).toHaveBeenCalledWith({
      itemId: 'item-calabresa',
      payload: {
        name: 'Calabresa Reforçada',
        description: 'Mussarela e calabresa',
        price: 55,
        requiresPreparation: true,
        ingredientIds: [],
      },
    });
    expect(onCloseMock).toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should surface a backend refusal verbatim', async () => {
    createMock.mockRejectedValue(new ApiError(400, 'Item name already in use'));
    const user = renderCreateDialog();

    await user.type(screen.getByLabelText('Nome'), 'Calabresa');
    await user.type(screen.getByLabelText('Descrição'), 'Mussarela');
    await user.type(screen.getByLabelText('Preço'), '45');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'DRINK');
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(
      await screen.findByText('Item name already in use'),
    ).toBeInTheDocument();
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
