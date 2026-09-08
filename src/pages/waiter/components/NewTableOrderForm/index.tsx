import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useAuth } from '@pages/auth/use-auth';
import {
  tableOrderFormSchema,
  type TTableOrderFormValues,
} from '../../business/schemas';
import { useCreateTableOrder } from '../../hooks/use-create-table-order';
import { Button } from '@components/Button';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';

export function NewTableOrderForm(): React.ReactNode {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createOrder = useCreateTableOrder();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TTableOrderFormValues>({
    resolver: zodResolver(tableOrderFormSchema),
    defaultValues: { tableId: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      return;
    }
    try {
      const created = await createOrder.mutateAsync({
        userId: user.id,
        tableId: values.tableId,
      });
      navigate(`/waiter/orders/${created.id}`);
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {errors.root && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errors.root.message}
        </p>
      )}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <TextField
            id="tableId"
            label="Nova mesa"
            placeholder="Número da mesa"
            error={errors.tableId?.message}
            {...register('tableId')}
          />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Abrindo…' : 'Abrir mesa'}
        </Button>
      </div>
    </form>
  );
}
