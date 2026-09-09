import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  cancellationReasonFormSchema,
  type TCancellationReasonFormValues,
} from '../../business/schemas';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';

interface CancelOrderDialogProps {
  tableNumber: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function CancelOrderDialog({
  tableNumber,
  onConfirm,
  onClose,
}: CancelOrderDialogProps): React.ReactNode {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TCancellationReasonFormValues>({
    resolver: zodResolver(cancellationReasonFormSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await onConfirm(values.reason);
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-sm">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Cancelar pedido da mesa ${tableNumber}`}
        >
          <h2 className="text-lg font-bold text-stone-900">
            Cancelar pedido da mesa {tableNumber}
          </h2>
          <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
            {errors.root && (
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {errors.root.message}
              </p>
            )}
            <TextField
              id="reason"
              label="Motivo"
              error={errors.reason?.message}
              {...register('reason')}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={onClose}
                className="bg-stone-200 text-stone-800 hover:bg-stone-300"
              >
                Voltar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Cancelando…' : 'Cancelar pedido'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
