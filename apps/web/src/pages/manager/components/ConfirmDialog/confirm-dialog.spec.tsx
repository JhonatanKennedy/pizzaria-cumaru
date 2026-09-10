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
});
