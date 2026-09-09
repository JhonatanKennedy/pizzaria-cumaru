import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import type { TTableListingEntry } from '@api/tables.api';
import { RenameTableDialog } from './index';

const { renameTableMock } = vi.hoisted(() => ({ renameTableMock: vi.fn() }));

vi.mock('../../../../hooks/use-rename-table', () => ({
  useRenameTable: () => ({ mutateAsync: renameTableMock }),
}));

const TABLE: TTableListingEntry = {
  id: 'table-5',
  number: 5,
  openOrder: null,
};

const onCloseMock = vi.fn();

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(<RenameTableDialog table={TABLE} onClose={onCloseMock} />);
  return userEvent.setup();
}

describe('RenameTableDialog', () => {
  it('should start from the current number', () => {
    renderDialog();

    expect(screen.getByLabelText('Número da mesa')).toHaveValue(5);
    expect(
      screen.getByRole('heading', { name: 'Renumerar mesa 5' }),
    ).toBeInTheDocument();
  });

  it('should submit the new number and close on success', async () => {
    renameTableMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.clear(screen.getByLabelText('Número da mesa'));
    await user.type(screen.getByLabelText('Número da mesa'), '12');
    await user.click(screen.getByRole('button', { name: 'Renumerar' }));

    expect(renameTableMock).toHaveBeenCalledWith({
      tableId: 'table-5',
      number: 12,
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should surface the duplicate refusal verbatim and stay open', async () => {
    renameTableMock.mockRejectedValue(
      new ApiError(400, 'Table number already exists'),
    );
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Renumerar' }));

    expect(
      await screen.findByText('Table number already exists'),
    ).toBeInTheDocument();
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
