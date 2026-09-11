import { useState } from 'react';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { toErrorMessage } from '@lib/errors';

interface CancelOrderDialogProps {
  tableNumber: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function CancelOrderDialog({
  tableNumber,
  onConfirm,
  onClose,
}: CancelOrderDialogProps): React.ReactNode {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async (): Promise<void> => {
    if (busy) {
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-4">
      <Card className="my-auto w-full max-w-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Cancelar pedido da mesa ${tableNumber}`}
        >
          <h2 className="text-lg font-bold text-stone-900">
            Cancelar pedido da mesa {tableNumber}
          </h2>
          <p className="mt-2 text-stone-600">
            O pedido será cancelado e a mesa ficará livre.
          </p>
          {errorMessage && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {errorMessage}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              disabled={busy}
              variant="secondary"
            >
              Voltar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={busy}>
              {busy ? 'Cancelando…' : 'Cancelar pedido'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
