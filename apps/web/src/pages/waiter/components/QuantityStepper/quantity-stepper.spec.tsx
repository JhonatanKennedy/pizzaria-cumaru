import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantityStepper } from './index';

const onDecreaseMock = vi.fn();
const onIncreaseMock = vi.fn();

function renderStepper(
  quantity: number,
  busy = false,
): ReturnType<typeof userEvent.setup> {
  render(
    <QuantityStepper
      quantity={quantity}
      busy={busy}
      onDecrease={onDecreaseMock}
      onIncrease={onIncreaseMock}
    />,
  );
  return userEvent.setup();
}

function renderStepperThatCannotIncrease(
  quantity: number,
): ReturnType<typeof userEvent.setup> {
  render(
    <QuantityStepper
      quantity={quantity}
      canIncrease={false}
      onDecrease={onDecreaseMock}
      onIncrease={onIncreaseMock}
    />,
  );
  return userEvent.setup();
}

describe('QuantityStepper', () => {
  it('should show the current quantity', () => {
    renderStepper(2);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should call onDecrease when the decrease button is pressed', async () => {
    const user = renderStepper(2);

    await user.click(
      screen.getByRole('button', { name: 'Diminuir quantidade' }),
    );

    expect(onDecreaseMock).toHaveBeenCalledTimes(1);
    expect(onIncreaseMock).not.toHaveBeenCalled();
  });

  it('should call onIncrease when the increase button is pressed', async () => {
    const user = renderStepper(2);

    await user.click(
      screen.getByRole('button', { name: 'Aumentar quantidade' }),
    );

    expect(onIncreaseMock).toHaveBeenCalledTimes(1);
    expect(onDecreaseMock).not.toHaveBeenCalled();
  });

  it('should disable the decrease button at quantity one', async () => {
    const user = renderStepper(1);

    await user.click(
      screen.getByRole('button', { name: 'Diminuir quantidade' }),
    );

    expect(onDecreaseMock).not.toHaveBeenCalled();
  });

  it('should disable both buttons while busy', async () => {
    const user = renderStepper(2, true);

    await user.click(
      screen.getByRole('button', { name: 'Aumentar quantidade' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Diminuir quantidade' }),
    );

    expect(onIncreaseMock).not.toHaveBeenCalled();
    expect(onDecreaseMock).not.toHaveBeenCalled();
  });

  it('should disable only the increase button when the increase is unavailable', async () => {
    const user = renderStepperThatCannotIncrease(2);

    await user.click(
      screen.getByRole('button', { name: 'Aumentar quantidade' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Diminuir quantidade' }),
    );

    expect(onIncreaseMock).not.toHaveBeenCalled();
    expect(onDecreaseMock).toHaveBeenCalledTimes(1);
  });
});
