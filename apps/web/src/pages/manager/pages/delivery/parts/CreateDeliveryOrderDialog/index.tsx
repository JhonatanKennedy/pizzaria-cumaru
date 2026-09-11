import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';
import {
  createDeliveryOrderFormSchema,
  type TCreateDeliveryOrderFormValues,
} from '../../../../business/delivery-schemas';
import { useCreateDeliveryOrder } from '../../../../hooks/use-create-delivery-order';

interface CreateDeliveryOrderDialogProps {
  userId: number;
  onCreated: (orderId: string) => void;
  onClose: () => void;
}

export function CreateDeliveryOrderDialog({
  userId,
  onCreated,
  onClose,
}: CreateDeliveryOrderDialogProps): React.ReactNode {
  const createDeliveryOrder = useCreateDeliveryOrder();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TCreateDeliveryOrderFormValues>({
    resolver: zodResolver(createDeliveryOrderFormSchema),
    defaultValues: { customerName: '', phone: '', address: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await createDeliveryOrder.mutateAsync({
        userId,
        customerName: values.customerName.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
      });
      onCreated(created.id);
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-4">
      <Card className="my-auto w-full max-w-md">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Novo pedido de entrega"
        >
          <h2 className="text-lg font-bold text-stone-900">
            Novo pedido de entrega
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Pedido recebido por WhatsApp — sem mesa, com endereço de entrega.
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
              id="delivery-customer-name"
              label="Nome do cliente"
              error={errors.customerName?.message}
              {...register('customerName')}
            />
            <TextField
              id="delivery-phone"
              label="Telefone"
              type="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <TextField
              id="delivery-address"
              label="Endereço de entrega"
              error={errors.address?.message}
              {...register('address')}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" onClick={onClose} variant="secondary">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando…' : 'Criar pedido'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
