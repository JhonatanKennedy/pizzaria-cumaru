import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TIngredientListing, TMenuItem } from '@api/catalog.api';
import { ApiError } from '@api/http-client';
import { ItemIngredientsDialog } from './index';

const { linkMock, unlinkMock, onCloseMock } = vi.hoisted(() => ({
  linkMock: vi.fn(),
  unlinkMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../hooks/use-link-ingredient', () => ({
  useLinkIngredient: () => ({ mutateAsync: linkMock }),
}));

vi.mock('../../hooks/use-unlink-ingredient', () => ({
  useUnlinkIngredient: () => ({ mutateAsync: unlinkMock }),
}));

const ITEM: TMenuItem = {
  id: 'item-1',
  name: 'Pizza de Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: ['ingredient-1'],
};

const INGREDIENTS: TIngredientListing = [
  { id: 'ingredient-1', name: 'Mussarela', available: true },
  { id: 'ingredient-2', name: 'Pepperoni', available: false },
];

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(
    <ItemIngredientsDialog
      item={ITEM}
      ingredients={INGREDIENTS}
      onClose={onCloseMock}
    />,
  );
  return userEvent.setup();
}

describe('ItemIngredientsDialog', () => {
  beforeEach(() => {
    linkMock.mockReset();
    unlinkMock.mockReset();
  });

  it('should show the linked state and the unavailable badge', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', {
        name: 'Ingredientes de Pizza de Calabresa',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Mussarela' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Pepperoni' }),
    ).not.toBeChecked();
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });

  it('should unlink a linked ingredient', async () => {
    unlinkMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Mussarela' }));

    expect(unlinkMock).toHaveBeenCalledWith({
      itemId: 'item-1',
      ingredientId: 'ingredient-1',
    });
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Mussarela' }),
      ).not.toBeChecked(),
    );
    expect(linkMock).not.toHaveBeenCalled();
  });

  it('should link an unlinked ingredient', async () => {
    linkMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Pepperoni' }));

    expect(linkMock).toHaveBeenCalledWith({
      itemId: 'item-1',
      ingredientId: 'ingredient-2',
    });
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Pepperoni' })).toBeChecked(),
    );
  });

  it('should disable the row while its request is pending', async () => {
    let resolveLink: ((value: void) => void) | undefined;
    linkMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLink = resolve;
      }),
    );
    const user = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Pepperoni' }));

    expect(linkMock).toHaveBeenCalledTimes(1);
    const checkbox = screen.getByRole('checkbox', { name: 'Pepperoni' });
    expect(checkbox).toBeDisabled();

    resolveLink?.(undefined);
    await waitFor(() => expect(checkbox).toBeEnabled());
  });

  it('should show the backend error message verbatim when the link fails', async () => {
    linkMock.mockRejectedValue(new ApiError(400, 'Ingredient not found'));
    const user = renderDialog();

    await user.click(screen.getByRole('checkbox', { name: 'Pepperoni' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ingredient not found',
    );
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Pepperoni' })).toBeEnabled(),
    );
    expect(screen.getByRole('checkbox', { name: 'Mussarela' })).toBeChecked();
  });
});
