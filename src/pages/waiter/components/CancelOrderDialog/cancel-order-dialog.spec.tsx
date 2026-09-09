import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import { CancelOrderDialog } from './index';

const onConfirmMock = vi.fn();
const onCloseMock = vi.fn();

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(
    <CancelOrderDialog
      tableNumber="5"
      onConfirm={onConfirmMock}
      onClose={onCloseMock}
    />,
  );
  return userEvent.setup();
}

describe('CancelOrderDialog', () => {
  it('should name the order being cancelled', () => {
    renderDialog();

    expect(
      screen.getByRole('heading', { name: 'Cancelar pedido da mesa 5' }),
    ).toBeInTheDocument();
  });

  it('should require a reason', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));

    expect(await screen.findByText('Motivo é obrigatório')).toBeInTheDocument();
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('should confirm with the informed reason', async () => {
    onConfirmMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.type(screen.getByLabelText('Motivo'), 'Cliente desistiu');
    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));

    expect(onConfirmMock).toHaveBeenCalledWith('Cliente desistiu');
  });

  it('should display the backend error message verbatim', async () => {
    onConfirmMock.mockRejectedValue(
      new ApiError(400, 'Cannot change a closed order'),
    );
    const user = renderDialog();

    await user.type(screen.getByLabelText('Motivo'), 'Cliente desistiu');
    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }));

    expect(
      await screen.findByText('Cannot change a closed order'),
    ).toBeInTheDocument();
  });

  it('should close when the back button is clicked', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onCloseMock).toHaveBeenCalled();
  });
});
