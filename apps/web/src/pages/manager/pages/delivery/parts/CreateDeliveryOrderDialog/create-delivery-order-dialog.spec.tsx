import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import { CreateDeliveryOrderDialog } from './index';

const { createMock, onCreatedMock, onCloseMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  onCreatedMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../../../../hooks/use-create-delivery-order', () => ({
  useCreateDeliveryOrder: () => ({ mutateAsync: createMock }),
}));

function renderDialog(): ReturnType<typeof userEvent.setup> {
  render(
    <CreateDeliveryOrderDialog
      userId={7}
      onCreated={onCreatedMock}
      onClose={onCloseMock}
    />,
  );
  return userEvent.setup();
}

describe('CreateDeliveryOrderDialog', () => {
  it('should create a delivery order with trimmed customer details', async () => {
    createMock.mockResolvedValue({ id: 'order-9' });
    const user = renderDialog();

    await user.type(screen.getByLabelText('Nome do cliente'), '  Maria Souza ');
    await user.type(screen.getByLabelText('Telefone'), '(88) 99999-0000');
    await user.type(
      screen.getByLabelText('Endereço de entrega'),
      ' Rua das Flores, 12 ',
    );
    await user.click(screen.getByRole('button', { name: 'Criar pedido' }));

    expect(createMock).toHaveBeenCalledWith({
      userId: 7,
      customerName: 'Maria Souza',
      phone: '(88) 99999-0000',
      address: 'Rua das Flores, 12',
    });
    expect(onCreatedMock).toHaveBeenCalledWith('order-9');
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should surface the backend rejection for a missing address verbatim', async () => {
    createMock.mockRejectedValue(
      new ApiError(400, 'Delivery address is required for delivery'),
    );
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Criar pedido' }));

    expect(
      await screen.findByText('Delivery address is required for delivery'),
    ).toBeInTheDocument();
    expect(onCreatedMock).not.toHaveBeenCalled();
  });

  it('should close without creating when cancelled', async () => {
    const user = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
  });
});
