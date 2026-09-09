import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemFormDialog } from './index';

const { createMock, onCloseMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../hooks/use-create-item', () => ({
  useCreateItem: () => ({ mutateAsync: createMock }),
}));

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(<ItemFormDialog onClose={onCloseMock} />);
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
    await user.click(screen.getByRole('button', { name: 'Salvar item' }));

    expect(createMock).toHaveBeenCalledWith({
      name: 'Calabresa Especial',
      description: 'Mussarela e calabresa',
      price: 55,
      category: 'PIZZA',
      requiresPreparation: true,
    });
    expect(onCloseMock).toHaveBeenCalled();
  });
});
