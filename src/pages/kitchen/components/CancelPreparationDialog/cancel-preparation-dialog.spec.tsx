import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import { CancelPreparationDialog } from './index';

const onConfirmMock = vi.fn();
const onCloseMock = vi.fn();

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(
    <CancelPreparationDialog
      itemName="Calabresa"
      onConfirm={onConfirmMock}
      onClose={onCloseMock}
    />,
  );
  return userEvent.setup();
}

describe('CancelPreparationDialog', () => {
  it('should name the item whose preparation is cancelled', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', { name: 'Cancelar preparo de Calabresa' }),
    ).toBeInTheDocument();
  });

  it('should refuse a cancel without a reason', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar preparo' }));

    expect(await screen.findByText('Motivo é obrigatório')).toBeInTheDocument();
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('should confirm with the informed reason', async () => {
    onConfirmMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.type(screen.getByLabelText('Motivo'), 'Item queimado');
    await user.click(screen.getByRole('button', { name: 'Cancelar preparo' }));

    expect(onConfirmMock).toHaveBeenCalledWith('Item queimado');
  });

  it('should close when the back button is clicked', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should surface a backend refusal verbatim', async () => {
    onConfirmMock.mockRejectedValue(
      new ApiError(409, 'Cannot cancel an item not in preparation'),
    );
    const user = renderDialog();

    await user.type(screen.getByLabelText('Motivo'), 'Item queimado');
    await user.click(screen.getByRole('button', { name: 'Cancelar preparo' }));

    expect(
      await screen.findByText('Cannot cancel an item not in preparation'),
    ).toBeInTheDocument();
  });
});
