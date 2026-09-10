import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IngredientFormDialog } from './index';

const { createMock, renameMock, onCloseMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  renameMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../hooks/use-create-ingredient', () => ({
  useCreateIngredient: () => ({ mutateAsync: createMock }),
}));

vi.mock('../../hooks/use-rename-ingredient', () => ({
  useRenameIngredient: () => ({ mutateAsync: renameMock }),
}));

const INGREDIENT = {
  id: 'ingredient-1',
  name: 'Mussarela',
  available: true,
};

function renderCreate(): ReturnType<typeof userEvent.setup> {
  render(<IngredientFormDialog onClose={onCloseMock} />);
  return userEvent.setup();
}

function renderRename(): ReturnType<typeof userEvent.setup> {
  render(
    <IngredientFormDialog ingredient={INGREDIENT} onClose={onCloseMock} />,
  );
  return userEvent.setup();
}

describe('IngredientFormDialog', () => {
  it('should create a new ingredient', async () => {
    createMock.mockResolvedValue(undefined);
    const user = renderCreate();

    await user.type(screen.getByLabelText('Nome'), 'Catupiry');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(createMock).toHaveBeenCalledWith('Catupiry');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should rename an existing ingredient', async () => {
    renameMock.mockResolvedValue(undefined);
    const user = renderRename();

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Muçarela');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(renameMock).toHaveBeenCalledWith({
      ingredientId: 'ingredient-1',
      name: 'Muçarela',
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should require a name', async () => {
    const user = renderCreate();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });
});
