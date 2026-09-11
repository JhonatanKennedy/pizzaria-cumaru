import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { TIngredient } from '@api/catalog.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';
import {
  ingredientNameFormSchema,
  type TIngredientNameFormValues,
} from '../../business/schemas';
import { useCreateIngredient } from '../../hooks/use-create-ingredient';
import { useRenameIngredient } from '../../hooks/use-rename-ingredient';

interface IngredientFormDialogProps {
  ingredient?: TIngredient;
  onClose: () => void;
}

export function IngredientFormDialog({
  ingredient,
  onClose,
}: IngredientFormDialogProps): React.ReactNode {
  const isRename = ingredient !== undefined;
  const createIngredientMutation = useCreateIngredient();
  const renameIngredientMutation = useRenameIngredient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TIngredientNameFormValues>({
    resolver: zodResolver(ingredientNameFormSchema),
    defaultValues: { name: ingredient?.name ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (ingredient) {
        await renameIngredientMutation.mutateAsync({
          ingredientId: ingredient.id,
          name: values.name,
        });
      } else {
        await createIngredientMutation.mutateAsync(values.name);
      }
      onClose();
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
          aria-label={isRename ? 'Renomear ingrediente' : 'Novo ingrediente'}
        >
          <h2 className="text-lg font-bold text-stone-900">
            {isRename ? 'Renomear ingrediente' : 'Novo ingrediente'}
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
              id="ingredient-name"
              label="Nome"
              error={errors.name?.message}
              {...register('name')}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" onClick={onClose} variant="secondary">
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
