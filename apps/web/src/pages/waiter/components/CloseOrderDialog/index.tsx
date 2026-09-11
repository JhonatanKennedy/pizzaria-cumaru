import { useState } from 'react';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { toErrorMessage } from '@lib/errors';
import {
  PAYMENT_TYPES,
  paymentLabel,
  type TPaymentType,
} from '@lib/payment-labels';

interface CloseOrderDialogProps {
  tableNumber: string;
  onConfirm: (paymentType: TPaymentType) => Promise<void>;
  onClose: () => void;
}

export function CloseOrderDialog({
  tableNumber,
  onConfirm,
  onClose,
}: CloseOrderDialogProps): React.ReactNode {
  const [paymentType, setPaymentType] = useState<TPaymentType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (): Promise<void> => {
    if (paymentType === null || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(paymentType);
    } catch (confirmError) {
      setError(toErrorMessage(confirmError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fechar conta da mesa ${tableNumber}`}
        >
          <h2 className="text-lg font-bold text-stone-900">
            Fechar conta da mesa {tableNumber}
          </h2>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-stone-700">
              Forma de pagamento
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAYMENT_TYPES.map((option) => (
                <label
                  key={option}
                  className={
                    paymentType === option
                      ? 'cursor-pointer rounded-full bg-red-700 px-3 py-1 text-sm font-medium text-white'
                      : 'cursor-pointer rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700'
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value={option}
                    checked={paymentType === option}
                    onChange={() => setPaymentType(option)}
                    className="sr-only"
                  />
                  {paymentLabel(option)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={busy}
              variant="secondary"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={paymentType === null || busy}
            >
              {busy ? 'Fechando…' : 'Fechar conta'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
