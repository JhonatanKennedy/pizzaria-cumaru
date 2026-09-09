import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import type { TTableListingEntry } from '@api/tables.api';
import { RemoveTableDialog } from './index';

const { deleteTableMock } = vi.hoisted(() => ({ deleteTableMock: vi.fn() }));

vi.mock('../../../../hooks/use-delete-table', () => ({
  useDeleteTable: () => ({ mutateAsync: deleteTableMock }),
}));

const TABLE: TTableListingEntry = {
  id: 'table-3',
  number: 3,
  openOrder: null,
};

const onCloseMock = vi.fn();

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(<RemoveTableDialog table={TABLE} onClose={onCloseMock} />);
  return userEvent.setup();
}

describe('RemoveTableDialog', () => {
  it('should confirm the removal and close on success', async () => {
    deleteTableMock.mockResolvedValue(undefined);
    const user = renderDialog();

    expect(screen.getByText('A mesa 3 será removida.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover' }));

    expect(deleteTableMock).toHaveBeenCalledWith('table-3');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should surface the orders refusal verbatim and stay open', async () => {
    deleteTableMock.mockRejectedValue(
      new ApiError(400, 'Cannot delete a table that has orders'),
    );
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Remover' }));

    expect(
      await screen.findByText('Cannot delete a table that has orders'),
    ).toBeInTheDocument();
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
