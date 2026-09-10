import { Button } from '@components/Button';

interface QuantityStepperProps {
  quantity: number;
  busy?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}

export function QuantityStepper({
  quantity,
  busy = false,
  onDecrease,
  onIncrease,
}: QuantityStepperProps): React.ReactNode {
  const atMinimum = quantity <= 1;

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Diminuir quantidade"
        disabled={busy || atMinimum}
        onClick={onDecrease}
        className="px-2 py-0.5 text-sm"
      >
        −
      </Button>
      <span className="min-w-6 text-center text-sm font-semibold text-stone-900">
        {quantity}
      </span>
      <Button
        aria-label="Aumentar quantidade"
        disabled={busy}
        onClick={onIncrease}
        className="px-2 py-0.5 text-sm"
      >
        +
      </Button>
    </div>
  );
}
