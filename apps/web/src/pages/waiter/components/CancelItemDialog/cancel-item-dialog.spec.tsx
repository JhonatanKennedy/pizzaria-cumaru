import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
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

  it('should confirm the cancellation without asking for a reason', async () => {
    onConfirmMock.mockResolvedValue(undefined);
    const user = renderDialog();

    expect(screen.queryByLabelText('Motivo')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar item' }));

    expect(onConfirmMock).toHaveBeenCalledWith();
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should close when the back button is clicked', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should surface a backend refusal verbatim', async () => {
    onConfirmMock.mockRejectedValue(
      new ApiError(409, 'Cannot cancel an item in preparation'),
    );
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar item' }));

    expect(
      await screen.findByText('Cannot cancel an item in preparation'),
    ).toBeInTheDocument();
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
