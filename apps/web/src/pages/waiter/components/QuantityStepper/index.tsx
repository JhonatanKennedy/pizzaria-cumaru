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

  // The buttons are glyphs, so there is no label to swap the way every other
  // action in the app does. The count carries the pending state instead: it
  // greys out while the new quantity is in flight, which is also the value
  // that is about to change.
  return (
    <div aria-busy={busy} className="flex shrink-0 items-center gap-1">
      <Button
        aria-label="Diminuir quantidade"
        disabled={busy || atMinimum}
        onClick={onDecrease}
        className="size-11 p-0 text-lg md:size-7 md:text-sm"
      >
        −
      </Button>
      <span
        className={`min-w-6 text-center text-sm font-semibold ${busy ? 'text-stone-400' : 'text-stone-900'}`}
      >
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
