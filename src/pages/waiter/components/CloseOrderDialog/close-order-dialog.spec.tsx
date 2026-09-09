import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@api/http-client';
import type { TPaymentType } from '@lib/payment-labels';
import { CloseOrderDialog } from './index';

function renderDialog(
  onConfirm: (paymentType: TPaymentType) => Promise<void> = vi.fn(
    async () => undefined,
  ),
  onClose: () => void = vi.fn(),
): ReturnType<typeof userEvent.setup> {
  render(
    <CloseOrderDialog
      tableNumber="3"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return userEvent.setup();
}

describe('CloseOrderDialog', () => {
  it('should list the three payment methods and keep confirm disabled until one is chosen', () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: 'Fechar conta da mesa 3' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Forma de pagamento')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dinheiro' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Cartão' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Pix' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar conta' })).toBeDisabled();
  });

  it('should confirm with the chosen payment method', async () => {
    const onConfirm = vi.fn(async () => undefined);
    const user = renderDialog(onConfirm);

    await user.click(screen.getByRole('radio', { name: 'Pix' }));
    await user.click(screen.getByRole('button', { name: 'Fechar conta' }));

    expect(onConfirm).toHaveBeenCalledWith('Pix');
  });

  it('should disable the actions while the close is in flight', async () => {
    let finishClose = (): void => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClose = resolve;
        }),
    );
    const user = renderDialog(onConfirm);

    await user.click(screen.getByRole('radio', { name: 'Cartão' }));
    await user.click(screen.getByRole('button', { name: 'Fechar conta' }));

    expect(screen.getByRole('button', { name: 'Fechando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();

    finishClose();
    await screen.findByRole('button', { name: 'Fechar conta' });
  });

  it('should surface the backend error verbatim and allow retrying', async () => {
    const onConfirm = vi.fn(async () => {
      throw new ApiError(403, 'Only the manager can close the order');
    });
    const user = renderDialog(onConfirm);

    await user.click(screen.getByRole('radio', { name: 'Dinheiro' }));
    await user.click(screen.getByRole('button', { name: 'Fechar conta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the manager can close the order',
    );
    expect(screen.getByRole('button', { name: 'Fechar conta' })).toBeEnabled();
  });

  it('should call onClose when Voltar is pressed', async () => {
    const onClose = vi.fn();
    const user = renderDialog(
      vi.fn(async () => undefined),
      onClose,
    );

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
