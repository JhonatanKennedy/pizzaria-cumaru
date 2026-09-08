import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CancelItemDialog } from './index';

const onConfirmMock = vi.fn();
const onCloseMock = vi.fn();

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(
    <CancelItemDialog
      itemName="Calabresa"
      onConfirm={onConfirmMock}
      onClose={onCloseMock}
    />,
  );
  return userEvent.setup();
}

describe('CancelItemDialog', () => {
  it('should name the item being cancelled', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', { name: 'Cancelar Calabresa' }),
    ).toBeInTheDocument();
  });

  it('should require a reason', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar item' }));

    expect(await screen.findByText('Motivo é obrigatório')).toBeInTheDocument();
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('should confirm with the informed reason', async () => {
    onConfirmMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.type(screen.getByLabelText('Motivo'), 'Cliente desistiu');
    await user.click(screen.getByRole('button', { name: 'Cancelar item' }));

    expect(onConfirmMock).toHaveBeenCalledWith('Cliente desistiu');
  });

  it('should close when the back button is clicked', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onCloseMock).toHaveBeenCalled();
  });
});
