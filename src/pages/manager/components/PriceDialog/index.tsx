import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { TMenuItem } from '@api/catalog.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';
import { priceFormSchema, type TPriceFormValues } from '../../business/schemas';
import { useUpdateItemPrice } from '../../hooks/use-update-item-price';

interface PriceDialogProps {
  item: TMenuItem;
  onClose: () => void;
}

export function PriceDialog({
  item,
  onClose,
}: PriceDialogProps): React.ReactNode {
  const updatePriceMutation = useUpdateItemPrice();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TPriceFormValues>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: { price: item.price },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updatePriceMutation.mutateAsync({
        itemId: item.id,
        price: values.price,
      });
      onClose();
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-sm">
        <div role="dialog" aria-modal="true" aria-label="Alterar preço">
          <h2 className="text-lg font-bold text-stone-900">
            Preço de {item.name}
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
              id="price-input"
              label="Preço"
              type="number"
              min={0}
              step="0.01"
              error={errors.price?.message}
              {...register('price', { valueAsNumber: true })}
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
                {isSubmitting ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
