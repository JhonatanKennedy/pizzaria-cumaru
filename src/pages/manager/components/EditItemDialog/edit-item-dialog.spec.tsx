import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditItemDialog } from './index';

const { updateMock, onCloseMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../hooks/use-update-item', () => ({
  useUpdateItem: () => ({ mutateAsync: updateMock }),
}));

const ITEM = {
  id: 'catalog-pizza-1',
  name: 'Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
};

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(<EditItemDialog item={ITEM} onClose={onCloseMock} />);
  return userEvent.setup();
}

describe('EditItemDialog', () => {
  it('should pre-fill the current name and description', () => {
    renderDialog();

    expect(screen.getByLabelText('Nome')).toHaveValue('Calabresa');
    expect(screen.getByLabelText('Descrição')).toHaveValue(
      'Mussarela e calabresa',
    );
  });

  it('should update the item and close', async () => {
    updateMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Calabresa Reforçada');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(updateMock).toHaveBeenCalledWith({
      itemId: 'catalog-pizza-1',
      payload: {
        name: 'Calabresa Reforçada',
        description: 'Mussarela e calabresa',
      },
    });
    expect(onCloseMock).toHaveBeenCalled();
  });
});
