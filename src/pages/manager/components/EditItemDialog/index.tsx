import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { TMenuItem } from '@api/catalog.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';
import { useUpdateItem } from '../../hooks/use-update-item';
import { z } from 'zod';

const editItemFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
});

type TEditItemFormValues = z.infer<typeof editItemFormSchema>;

interface EditItemDialogProps {
  item: TMenuItem;
  onClose: () => void;
}

export function EditItemDialog({
  item,
  onClose,
}: EditItemDialogProps): React.ReactNode {
  const updateItemMutation = useUpdateItem();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TEditItemFormValues>({
    resolver: zodResolver(editItemFormSchema),
    defaultValues: { name: item.name, description: item.description },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateItemMutation.mutateAsync({
        itemId: item.id,
        payload: values,
      });
      onClose();
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md">
        <div role="dialog" aria-modal="true" aria-label="Editar item">
          <h2 className="text-lg font-bold text-stone-900">
            Editar {item.name}
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
              id="edit-item-name"
              label="Nome"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextField
              id="edit-item-description"
              label="Descrição"
              error={errors.description?.message}
              {...register('description')}
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
