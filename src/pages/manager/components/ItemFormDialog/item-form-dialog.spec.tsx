import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TIngredientListing } from '@api/catalog.api';
import { ItemFormDialog } from './index';

const { createMock, onCloseMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../hooks/use-create-item', () => ({
  useCreateItem: () => ({ mutateAsync: createMock }),
}));

const INGREDIENTS: TIngredientListing = [
  { id: 'ingredient-1', name: 'Mussarela', available: true },
  { id: 'ingredient-2', name: 'Pepperoni', available: false },
];

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(<ItemFormDialog ingredients={INGREDIENTS} onClose={onCloseMock} />);
  return userEvent.setup();
}

describe('ItemFormDialog', () => {
  it('should show validation errors when submitted empty', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Descrição é obrigatória')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create the item and close', async () => {
    createMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.type(screen.getByLabelText('Nome'), 'Calabresa Especial');
    await user.type(
      screen.getByLabelText('Descrição'),
      'Mussarela e calabresa',
    );
    await user.type(screen.getByLabelText('Preço'), '55');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'PIZZA');
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
    const user = renderDialog();

    await user.type(screen.getByLabelText('Nome'), 'Calabresa');
    await user.type(screen.getByLabelText('Descrição'), 'Mussarela');
    await user.type(screen.getByLabelText('Preço'), '45');
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ ingredientIds: [] }),
    );
  });

  it('should show which ingredients are unavailable', () => {
    renderDialog();

    expect(
      screen.getByRole('checkbox', { name: /Pepperoni/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Indisponível')).toHaveLength(1);
  });
});
