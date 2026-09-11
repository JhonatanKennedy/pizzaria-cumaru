import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import { ConfirmDialog } from './index';

const onConfirmMock = vi.fn();
const onCloseMock = vi.fn();

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(
    <ConfirmDialog
      title="Excluir item"
      message="O item será removido do cardápio."
      confirmLabel="Excluir"
      onConfirm={onConfirmMock}
      onClose={onCloseMock}
    />,
  );
  return userEvent.setup();
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    onConfirmMock.mockReset();
    onCloseMock.mockReset();
  });

  it('should confirm and close on success', async () => {
    onConfirmMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onConfirmMock).toHaveBeenCalled();
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should show the backend error when the confirmation fails', async () => {
    onConfirmMock.mockRejectedValue(new ApiError(400, 'Cannot delete'));
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Cannot delete')).toBeInTheDocument();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should hold the dialog while the confirmation is in flight', async () => {
    // A promise that never settles: the assertion is about the window between
    // the tap and the answer, which is exactly when a second tap would land.
    onConfirmMock.mockReturnValue(new Promise<void>(() => {}));
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Confirmando…' }));

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });
});
