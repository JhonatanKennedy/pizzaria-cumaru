import { Button } from '@components/Button';

interface QuantityStepperProps {
  quantity: number;
  busy?: boolean;
  canIncrease?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}

export function QuantityStepper({
  quantity,
  busy = false,
  canIncrease = true,
  onDecrease,
  onIncrease,
}: QuantityStepperProps): React.ReactNode {
  const atMinimum = quantity <= 1;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        aria-label="Diminuir quantidade"
        disabled={busy || atMinimum}
        onClick={onDecrease}
        className="size-11 p-0 text-lg md:size-7 md:text-sm"
      >
        −
      </Button>
      <span className="min-w-6 text-center text-sm font-semibold text-stone-900">
        {quantity}
      </span>
      <Button
        aria-label="Aumentar quantidade"
        disabled={busy || !canIncrease}
        onClick={onIncrease}
        className="size-11 p-0 text-lg md:size-7 md:text-sm"
      >
        +
      </Button>
    </div>
  );
}
