import { useState } from 'react';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { toErrorMessage } from '@lib/errors';

interface CancelPreparationDialogProps {
  itemName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function CancelPreparationDialog({
  itemName,
  onConfirm,
  onClose,
}: CancelPreparationDialogProps): React.ReactNode {
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
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Cancelar preparo de ${itemName}`}
        >
          <h2 className="text-lg font-bold text-stone-900">
            Cancelar preparo de {itemName}
          </h2>
          <p className="mt-2 text-stone-600">
            O item sairá da fila e o pedido permanecerá aberto.
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
              className="bg-stone-200 text-stone-800 hover:bg-stone-300"
            >
              Voltar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={busy}>
              {busy ? 'Cancelando…' : 'Cancelar preparo'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
