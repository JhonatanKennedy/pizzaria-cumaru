import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { TTableListingEntry } from '@api/tables.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';
import {
  tableNumberFormSchema,
  type TTableNumberFormValues,
} from '../../../../business/table-schemas';
import { useRenameTable } from '../../../../hooks/use-rename-table';

interface RenameTableDialogProps {
  table: TTableListingEntry;
  onClose: () => void;
}

export function RenameTableDialog({
  table,
  onClose,
}: RenameTableDialogProps): React.ReactNode {
  const renameTableMutation = useRenameTable();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TTableNumberFormValues>({
    resolver: zodResolver(tableNumberFormSchema),
    defaultValues: { number: table.number },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await renameTableMutation.mutateAsync({
        tableId: table.id,
        number: values.number,
      });
      onClose();
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-sm">
        <div role="dialog" aria-modal="true" aria-label="Renumerar mesa">
          <h2 className="text-lg font-bold text-stone-900">
            Renumerar mesa {table.number}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            O novo número vale para o salão e para os próximos pedidos.
          </p>
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
              id="table-number"
              label="Número da mesa"
              type="number"
              min={1}
              error={errors.number?.message}
              {...register('number', { valueAsNumber: true })}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={onClose}
                className="bg-stone-200 text-stone-800 hover:bg-stone-300"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Renumerando…' : 'Renumerar'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
