import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import { RegisterTableDialog } from './index';

const { createTableMock } = vi.hoisted(() => ({ createTableMock: vi.fn() }));

vi.mock('../../../../hooks/use-create-table', () => ({
  useCreateTable: () => ({ mutateAsync: createTableMock }),
}));

const onCloseMock = vi.fn();

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(<RegisterTableDialog onClose={onCloseMock} />);
  return userEvent.setup();
}

describe('RegisterTableDialog', () => {
  it('should submit the number and close on success', async () => {
    createTableMock.mockResolvedValue(undefined);
    const user = renderDialog();

    await user.type(screen.getByLabelText('Número da mesa'), '11');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(createTableMock).toHaveBeenCalledWith(11);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should show the required message when submitted empty', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText('Número é obrigatório')).toBeInTheDocument();
    expect(createTableMock).not.toHaveBeenCalled();
  });

  it('should reject zero with the local message', async () => {
    const user = renderDialog();

    await user.type(screen.getByLabelText('Número da mesa'), '0');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(
      await screen.findByText('Número deve ser maior que zero'),
    ).toBeInTheDocument();
    expect(createTableMock).not.toHaveBeenCalled();
  });

  it('should surface the duplicate refusal verbatim and stay open', async () => {
    createTableMock.mockRejectedValue(
      new ApiError(400, 'Table number already exists'),
    );
    const user = renderDialog();

    await user.type(screen.getByLabelText('Número da mesa'), '11');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(
      await screen.findByText('Table number already exists'),
    ).toBeInTheDocument();
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
