import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TIngredientListing } from '@api/catalog.api';
import { IngredientsTab } from './index';

const {
  createIngredientMock,
  renameIngredientMock,
  deleteIngredientMock,
  toggleStockMock,
} = vi.hoisted(() => ({
  createIngredientMock: vi.fn(),
  renameIngredientMock: vi.fn(),
  deleteIngredientMock: vi.fn(),
  toggleStockMock: vi.fn(),
}));

vi.mock('../../../../hooks/use-create-ingredient', () => ({
  useCreateIngredient: () => ({ mutateAsync: createIngredientMock }),
}));

vi.mock('../../../../hooks/use-rename-ingredient', () => ({
  useRenameIngredient: () => ({ mutateAsync: renameIngredientMock }),
}));

vi.mock('../../../../hooks/use-delete-ingredient', () => ({
  useDeleteIngredient: () => ({ mutateAsync: deleteIngredientMock }),
}));

vi.mock('../../../../hooks/use-toggle-ingredient-stock', () => ({
  useToggleIngredientStock: () => ({ mutateAsync: toggleStockMock }),
}));

const INGREDIENTS: TIngredientListing = [
  { id: 'ingredient-mussarela', name: 'Mussarela', available: true },
  { id: 'ingredient-calabresa', name: 'Calabresa', available: true },
  { id: 'ingredient-manjericao', name: 'Manjericão', available: false },
];

function renderTab(
  ingredients: TIngredientListing = INGREDIENTS,
): ReturnType<typeof userEvent.setup> {
  render(<IngredientsTab ingredients={ingredients} />);
  return userEvent.setup();
}

function searchField(): HTMLElement {
  return screen.getByRole('searchbox', { name: 'Buscar ingrediente' });
}

describe('IngredientsTab', () => {
  it('should list every ingredient with its stock state', () => {
    renderTab();

    expect(screen.getByText('Mussarela')).toBeInTheDocument();
    expect(screen.getByText('Calabresa')).toBeInTheDocument();
    expect(screen.getByText('Manjericão')).toBeInTheDocument();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.getByText('3 ingredientes')).toBeInTheDocument();
  });

  it('should find an ingredient by name across accents', async () => {
    const user = renderTab();

    await user.type(searchField(), 'manjericao');

    expect(screen.getByText('Manjericão')).toBeInTheDocument();
    expect(screen.queryByText('Mussarela')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 3 ingredientes')).toBeInTheDocument();
  });

  it('should say what the search looked for when it finds nothing', async () => {
    const user = renderTab();

    await user.type(searchField(), 'gorgonzola');

    expect(
      screen.getByText('Nenhum ingrediente para "gorgonzola".'),
    ).toBeInTheDocument();
  });

  it('should teach the empty list instead of blaming the search', () => {
    renderTab([]);

    expect(
      screen.getByText(
        'Nenhum ingrediente cadastrado. Use "Novo ingrediente" para cadastrar o primeiro.',
      ),
    ).toBeInTheDocument();
  });

  it('should mark an available ingredient as unavailable', async () => {
    toggleStockMock.mockResolvedValue(undefined);
    const user = renderTab();

    await user.click(
      screen.getByRole('button', { name: 'Marcar indisponível: Mussarela' }),
    );

    // The hook takes the ingredient and its next state; the button says which
    // way the toggle goes.
    expect(toggleStockMock).toHaveBeenCalledWith({
      ingredientId: 'ingredient-mussarela',
      available: false,
    });
  });

  it('should offer the opposite toggle for an ingredient already out of stock', async () => {
    toggleStockMock.mockResolvedValue(undefined);
    const user = renderTab();

    await user.click(
      screen.getByRole('button', { name: 'Marcar disponível: Manjericão' }),
    );

    expect(toggleStockMock).toHaveBeenCalledWith({
      ingredientId: 'ingredient-manjericao',
      available: true,
    });
  });

  it('should rename the ingredient behind its own dialog', async () => {
    renameIngredientMock.mockResolvedValue(undefined);
    const user = renderTab();

    await user.click(
      screen.getByRole('button', { name: 'Renomear Calabresa' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Renomear ingrediente' });
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Calabresa');
  });

  it('should remove the ingredient behind an explicit confirmation', async () => {
    deleteIngredientMock.mockResolvedValue(undefined);
    const user = renderTab();

    await user.click(screen.getByRole('button', { name: 'Excluir Calabresa' }));

    const dialog = screen.getByRole('dialog', { name: 'Excluir ingrediente' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(deleteIngredientMock).toHaveBeenCalledWith('ingredient-calabresa');
  });
});
