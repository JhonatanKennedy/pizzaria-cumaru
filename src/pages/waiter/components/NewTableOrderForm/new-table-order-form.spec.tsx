import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { NewTableOrderForm } from './index';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('../../../auth/use-auth', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

vi.mock('../../hooks/use-create-table-order', () => ({
  useCreateTableOrder: () => ({ mutateAsync: createMock }),
}));

function renderForm(): ReturnType<typeof userEvent.setup> {
  render(
    <MemoryRouter initialEntries={['/tables']}>
      <Routes>
        <Route path="/tables" element={<NewTableOrderForm />} />
        <Route
          path="/waiter/orders/order-1"
          element={<div>Pedido aberto</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('NewTableOrderForm', () => {
  it('should show a validation error when submitted empty', async () => {
    const user = renderForm();

    await user.click(screen.getByRole('button', { name: 'Abrir mesa' }));

    expect(
      await screen.findByText('Número da mesa é obrigatório'),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create the order and open its detail', async () => {
    createMock.mockResolvedValue({ id: 'order-1' });
    const user = renderForm();

    await user.type(screen.getByLabelText('Nova mesa'), '5');
    await user.click(screen.getByRole('button', { name: 'Abrir mesa' }));

    expect(await screen.findByText('Pedido aberto')).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledWith({ userId: 1, tableId: '5' });
  });
});
