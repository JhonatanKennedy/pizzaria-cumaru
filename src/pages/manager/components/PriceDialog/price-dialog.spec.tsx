import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceDialog } from './index';

const { updatePriceMock, onCloseMock } = vi.hoisted(() => ({
  updatePriceMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../hooks/use-update-item-price', () => ({
  useUpdateItemPrice: () => ({ mutateAsync: updatePriceMock }),
}));

const ITEM = {
  id: 'catalog-pizza-1',
  name: 'Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: [],
};

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(<PriceDialog item={ITEM} onClose={onCloseMock} />);
  return userEvent.setup();
}

describe('PriceDialog', () => {
  it('should update the price and close', async () => {
    updatePriceMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.clear(screen.getByLabelText('Preço'));
    await user.type(screen.getByLabelText('Preço'), '55');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(updatePriceMock).toHaveBeenCalledWith({
      itemId: 'catalog-pizza-1',
      price: 55,
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should reject a non-positive price', async () => {
    const user = renderDialog();

    await user.clear(screen.getByLabelText('Preço'));
    await user.type(screen.getByLabelText('Preço'), '0');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Preço deve ser maior que zero'),
    ).toBeInTheDocument();
    expect(updatePriceMock).not.toHaveBeenCalled();
  });
});
